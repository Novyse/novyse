import { Platform } from "react-native";
import WebRTCLogger from "../logging/WebRTCLogger.js";
import { GlobalState } from "../core/GlobalState.js";
import Compatibility from "../utils/compatibility.js";
import { Helpers } from "../utils/helpers.js";
import APIMethods from "../../APImethods.js";
import eventEmitter from "../utils/EventEmitter.js";
import SoundPlayer from "../../sounds/SoundPlayer.js";
import { getScreenShareConstraints } from "../config/mediaConstraints.js";

const { mediaDevices } = Compatibility.getWebRTCLib();

/**
 * ScreenShareManager - Gestisce la condivisione schermo
 * Include avvio, arresto, gestione permessi e compatibilità multi-piattaforma
 */
export class ScreenShareManager {
  constructor(globalState, logger, pinManager) {
    this.logger = logger || WebRTCLogger;
    this.globalState = globalState || new GlobalState();
    this.pinManager = pinManager;
    // Contatore per ID univoci degli stream
    this.screenStreamCounter = 0;

    this.logger.debug("ScreenShareManager inizializzato", {
      component: "ScreenShareManager",
      platform: Platform.OS,
    });
  }

  /**
   * Ferma una condivisione schermo specifica
   * @param {string} screenShareUUID - ID dello stream da fermare
   * @returns {Promise<boolean>}
   */
  async stopScreenShare(screenShareUUID) {
    this.logger.info(`Arresto condivisione schermo: ${screenShareUUID}`, {
      component: "ScreenShareManager",
      screenShareUUID,
      action: "stopScreenShare",
    });

    const screenStream = this.globalState.getActiveStream(
      this.globalState.getMyId(),
      screenShareUUID
    );
    if (!screenStream) {
      this.logger.warning(
        `Stream screen share non trovato: ${screenShareUUID}`,
        {
          component: "ScreenShareManager",
          screenShareUUID,
        }
      );
      return false;
    }

    try {
      // Rimuovi stream da tutte le connessioni peer
      await this._removeScreenStreamFromAllPeers(screenShareUUID);

      // Ferma tutte le tracce dello stream
      screenStream.getTracks().forEach((track) => {
        track.stop();
        this.logger.debug("Traccia screen share fermata", {
          component: "ScreenShareManager",
          screenShareUUID,
          trackId: track.id,
          trackKind: track.kind,
        });
      });

      // Remove from userData using the new removeScreenShare method
      const myParticipantId = this.globalState.getMyId();
      this.globalState.removeScreenShare(myParticipantId, screenShareUUID);

      // Pulisci pin se questo stream era pinnato
      this.pinManager.clearPinIfId(screenShareUUID);

      eventEmitter.sendLocalUpdateNeeded(
        myParticipantId,
        screenShareUUID,
        null, // Passa null per indicare che lo stream è stato fermato
        "remove"
      );

      // Rinegozia con tutti i peer
      setTimeout(() => {
        this._renegotiateWithAllPeers();
      }, 100);

      this.logger.info(
        `Stream screen share fermato con successo: ${screenShareUUID}`,
        {
          component: "ScreenShareManager",
          screenShareUUID,
        }
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Errore fermando stream screen share: ${screenShareUUID}`,
        {
          component: "ScreenShareManager",
          screenShareUUID,
          error: error.message,
          stack: error.stack,
        }
      );
      return false;
    }
  }

  /**
   * Ferma tutte le condivisioni schermo
   * @returns {Promise<void>}
   */
  async stopAllScreenShares() {
    this.logger.info("Arresto di tutte le condivisioni schermo", {
      component: "ScreenShareManager",
      action: "stopAllScreenShares",
    });

    const screenStreams = this.globalState.getAllLocalActiveStreams();

    if (!screenStreams || Object.keys(screenStreams).length === 0) {
      this.logger.info("Nessuna condivisione schermo attiva da fermare", {
        component: "ScreenShareManager",
        action: "stopAllScreenShares",
      });
      return;
    }

    const screenShareUUIDs = Object.keys(screenStreams);
    for (const screenShareUUID of screenShareUUIDs) {
      if (
        screenShareUUID != this.globalState.getMyId() &&
        screenShareUUID != "null"
      ) {
        await this.stopScreenShare(screenShareUUID);
      }
    }

    this.logger.info(
      `${screenShareUUIDs.length} condivisioni schermo fermate`,
      {
        component: "ScreenShareManager",
        stoppedStreams: screenShareUUIDs.length,
      }
    );
  }

  /**
   * Gestisce l'arrivo di un evento screen share remoto
   * @param {Object} data - Dati evento screen share
   * @returns {void}
   */
  handleRemoteScreenShareStarted(data) {
    const { from, screenShareUUID } = data;

    if (from && from !== this.globalState.getMyId()) {
      this.logger.info(
        `Screen share remoto avviato: ${from}/${screenShareUUID}`,
        {
          component: "ScreenShareManager",
          participantId: from,
          screenShareUUID,
          action: "handleRemoteScreenShareStarted",
        }
      );

      // Inizializza tracking metadata
      this.globalState.setStreamMetadata(from, screenShareUUID, "screenshare");

      // Lo stream effettivo sarà gestito in ontrack quando arriva il media
    }
  }

  /**
   * Gestisce l'arrivo di un evento screen share remoto fermato
   * @param {Object} data - Dati evento screen share
   * @returns {void}
   */
  handleRemoteScreenShareStopped(data) {
    const { from, screenShareUUID } = data;

    if (from && from !== this.globalState.getMyId()) {
      this.logger.info(
        `Screen share remoto fermato: ${from}/${screenShareUUID}`,
        {
          component: "ScreenShareManager",
          participantId: from,
          screenShareUUID,
          action: "handleRemoteScreenShareStopped",
        }
      );

      // Pulisci pin se questo screen share era pinnato
      this._clearPinIfscreenShareUUID(screenShareUUID);

      // Rimuovi metadata
      this.globalState.removeStreamMetadata(from, screenShareUUID);

      // Rimuovi stream
      this.globalState.removeRemoteScreenStream(from, screenShareUUID);

      eventEmitter.sendLocalUpdateNeeded(
        from,
        screenShareUUID,
        null, // Passa null per indicare che lo stream è stato fermato
        "remove"
      );
    }
  }

  /**
   * Pulisce tutte le risorse screen share
   * @returns {void}
   */
  cleanup() {
    this.logger.info("Pulizia completa ScreenShareManager", {
      component: "ScreenShareManager",
      action: "cleanup",
    });

    // Ferma tutte le condivisioni schermo attive
    this.stopAllScreenShares();
  }

  /**
   * Acquisisce uno stream screen share dalla piattaforma
   * @returns {Promise<MediaStream|null>}
   * @private
   */
  async acquireScreenStream(platform, commsSettings = {}) {
    this.logger.debug("Acquisizione stream screen share", {
      component: "ScreenShareManager",
      platform: platform,
    });

    if (platform === "web") {
      return await this._acquireWebScreenStream(commsSettings);
    } else {
      return await this._acquireAndroidScreenStream(commsSettings);
    }
  }

  /**
   * Acquisisce stream screen share su web
   * @returns {Promise<MediaStream|null>}
   * @private
   */
  async _acquireWebScreenStream(commsSettings = {}) {
    try {

      const quality = commsSettings.screenShareQuality;
      const fps = commsSettings.screenShareFPS;
      const audio = commsSettings.screenShareAudio;

      const constraints = getScreenShareConstraints("web",quality, fps, audio);
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      this.logger.debug("Stream screen share web acquisito", {
        component: "ScreenShareManager",
        screenShareUUID: stream.id,
        tracks: stream.getTracks().length,
        constraints: constraints,
      });

      return stream;
    } catch (permissionError) {
      // Handle permission denied gracefully for web
      if (
        permissionError.name === "NotAllowedError" ||
        permissionError.message.includes("Permission denied") ||
        permissionError.message.includes("cancelled by user") ||
        permissionError.message.includes("Permission dismissed")
      ) {
        console.log(
          "Screen share permission denied by user - silently ignoring"
        );
        return null; // Return null instead of throwing, so the UI can stay in previous state
      }
      throw permissionError; // Re-throw other errors
    }
  }

  /**
   * Acquisisce stream screen share su Android
   * @returns {Promise<MediaStream|null>}
   * @private
   */
  async _acquireAndroidScreenStream(commsSettings = {}) {
    // DA FIXARE CON I CONSTRAI PRESI DA MEDIACONSTRAINTS QUANDO VERRÀ RIFATTA LA FUNZIONE @SamueleOrazioDurante
    let screenStream = null;
    const platform = Platform.OS;

    this.logger.info("🔍 Tentativo acquisizione screen stream Android", {
      component: "ScreenShareManager",
      platform,
      hasGetDisplayMedia: !!mediaDevices.getDisplayMedia,
      hasGetUserMedia: !!mediaDevices.getUserMedia,
    });

    try {
      // Metodo 1: getDisplayMedia (react-native-webrtc)
      if (mediaDevices.getDisplayMedia) {
        try {
          const constraints = this.SCREEN_SHARE_CONSTRAINTS.android;

          // AGGIUNGI QUESTI CONSTRAINTS SPECIFICI PER ANDROID
          const androidConstraints = {
            video: {
              mediaSource: "screen", // Forza sorgente schermo
              mandatory: {
                chromeMediaSource: "screen",
                chromeMediaSourceId: "screen:0",
                maxWidth: 1920,
                maxHeight: 1080,
                maxFrameRate: 15,
              },
            },
            audio: false,
          };

          this.logger.info("📱 Usando constraints Android specifici:", {
            component: "ScreenShareManager",
            constraints: androidConstraints,
          });

          screenStream = await mediaDevices.getDisplayMedia(androidConstraints);

          // VERIFICA CHE SIA REALMENTE SCREEN SHARE
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            this.logger.info("🔍 Analisi dettagliata track video:", {
              component: "ScreenShareManager",
              label: videoTrack.label,
              kind: videoTrack.kind,
              id: videoTrack.id,
              settings: videoTrack.getSettings
                ? videoTrack.getSettings()
                : "N/A",
              capabilities: videoTrack.getCapabilities
                ? videoTrack.getCapabilities()
                : "N/A",
            });

            // Se label è vuoto o contiene "camera", non è screen share
            if (
              !videoTrack.label ||
              videoTrack.label.toLowerCase().includes("camera") ||
              videoTrack.label.toLowerCase().includes("back") ||
              videoTrack.label.toLowerCase().includes("front")
            ) {
              this.logger.error(
                "❌ FALSO POSITIVO: getDisplayMedia ha ritornato camera, non screen!",
                {
                  component: "ScreenShareManager",
                  trackLabel: videoTrack.label,
                }
              );

              // Ferma lo stream fasullo
              screenStream.getTracks().forEach((track) => track.stop());
              throw new Error(
                "getDisplayMedia ha ritornato camera invece di screen share"
              );
            }
          }

          this.logger.info("✅ getDisplayMedia Android riuscito", {
            component: "ScreenShareManager",
            streamId: screenStream.id,
            tracks: screenStream.getTracks().length,
            tracksInfo: screenStream.getTracks().map((track) => ({
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState,
            })),
          });
          return screenStream;
        } catch (displayError) {
          this.logger.warning("❌ getDisplayMedia Android fallito", {
            component: "ScreenShareManager",
            error: displayError.message,
            errorName: displayError.name,
            errorCode: displayError.code,
          });

          if (
            displayError.name === "NotAllowedError" ||
            displayError.message.includes("Permission denied") ||
            displayError.message.includes("cancelled by user")
          ) {
            this.logger.info("🚫 Permessi screen share negati", {
              component: "ScreenShareManager",
              errorType: "permission_denied",
            });
            throw displayError; // Re-throw permission errors
          }

          screenStream = null;
        }
      } else {
        this.logger.warning(
          "⚠️ getDisplayMedia non disponibile su questo dispositivo",
          {
            component: "ScreenShareManager",
          }
        );
      }

      // Metodo 2: getUserMedia con source screen
      if (!screenStream && mediaDevices.getUserMedia) {
        try {
          this.logger.info("📱 Tentativo getUserMedia con screen source", {
            component: "ScreenShareManager",
          });

          const screenConstraints = {
            video: {
              mandatory: {
                chromeMediaSource: "screen",
                maxWidth: 1920,
                maxHeight: 1080,
                maxFrameRate: 15,
              },
            },
            audio: false,
          };

          this.logger.debug("🎛️ Screen constraints usati:", {
            component: "ScreenShareManager",
            constraints: screenConstraints,
          });

          screenStream = await mediaDevices.getUserMedia(screenConstraints);

          this.logger.info("✅ getUserMedia con screen source riuscito", {
            component: "ScreenShareManager",
            streamId: screenStream.id,
            tracks: screenStream.getTracks().length,
            tracksInfo: screenStream.getTracks().map((track) => ({
              kind: track.kind,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState,
            })),
          });
          return screenStream;
        } catch (screenError) {
          this.logger.warning("❌ getUserMedia con screen source fallito", {
            component: "ScreenShareManager",
            error: screenError.message,
            errorName: screenError.name,
            errorCode: screenError.code,
          });

          if (
            screenError.name === "NotAllowedError" ||
            screenError.message.includes("Permission denied") ||
            screenError.message.includes("cancelled by user")
          ) {
            this.logger.info("🚫 Permessi screen share negati", {
              component: "ScreenShareManager",
              errorType: "permission_denied",
            });
            throw screenError; // Re-throw permission errors
          }

          screenStream = null;
        }
      } else if (!mediaDevices.getUserMedia) {
        this.logger.warning(
          "⚠️ getUserMedia non disponibile su questo dispositivo",
          {
            component: "ScreenShareManager",
          }
        );
      }

      // Metodo 3: Fallback camera di alta qualità
      if (!screenStream) {
        this.logger.warning(
          "⚠️ Screen sharing nativo fallito, usando fallback camera",
          {
            component: "ScreenShareManager",
            message:
              "ATTENZIONE: Questo NON è screen sharing reale, ma camera posteriore",
          }
        );

        try {
          const cameraConstraints = {
            video: {
              width: { ideal: 1920, min: 720 },
              height: { ideal: 1080, min: 480 },
              frameRate: { ideal: 30, min: 15 },
              facingMode: { ideal: "environment" }, // Back camera typically better quality
            },
            audio: false,
          };

          this.logger.debug("📷 Camera fallback constraints:", {
            component: "ScreenShareManager",
            constraints: cameraConstraints,
          });

          screenStream = await mediaDevices.getUserMedia(cameraConstraints);

          // Marca le tracce come screen share per identificazione
          screenStream.getTracks().forEach((track) => {
            track.label = `screen-share-fallback-${Date.now()}`;
            track._isScreenShareFallback = true; // Flag personalizzato
          });

          this.logger.warning(
            "📷 Camera fallback per screen sharing attivata",
            {
              component: "ScreenShareManager",
              streamId: screenStream.id,
              tracks: screenStream.getTracks().length,
              message:
                "ATTENZIONE: Questo è un fallback camera, NON screen sharing reale",
              tracksInfo: screenStream.getTracks().map((track) => ({
                kind: track.kind,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState,
                isFallback: track._isScreenShareFallback,
              })),
            }
          );

          return screenStream;
        } catch (cameraError) {
          this.logger.error("💥 Anche camera fallback fallita", {
            component: "ScreenShareManager",
            error: cameraError.message,
            errorName: cameraError.name,
            errorCode: cameraError.code,
          });
          throw new Error(
            "Impossibile ottenere stream per screen sharing su Android"
          );
        }
      }

      return screenStream;
    } catch (error) {
      this.logger.error(
        "💥 Errore generale acquisizione screen share Android",
        {
          component: "ScreenShareManager",
          error: error.message,
          errorName: error.name,
          stack: error.stack,
        }
      );
      throw error;
    }
  }

  /**
   * Configura gestori per la fine dello stream
   * @param {MediaStream} stream - Stream screen share
   * @param {string} screenShareUUID - ID dello stream
   * @returns {void}
   * @private
   */
  _setupStreamEndHandlers(stream, screenShareUUID) {
    // Gestisci fine condivisione tramite browser UI (solo video track)
    const videoTracks = stream.getVideoTracks();

    videoTracks.forEach((track) => {
      track.onended = async () => {
        this.logger.info(`Traccia screen share terminata: ${screenShareUUID}`, {
          component: "ScreenShareManager",
          screenShareUUID,
          trackId: track.id,
        });

        // Chiama API per fermare screen share

        await APIMethods.stopScreenShare(
          this.globalState.getChatId(),
          screenShareUUID
        );

        SoundPlayer.getInstance().playSound("comms_stream_stopped");

        // Rimuovi stream
        await this.stopScreenShare(screenShareUUID);
      };
    });
  }

  /**
   * Aggiunge stream screen share a tutte le connessioni peer
   * @param {MediaStream} stream - Stream screen share
   * @param {string} screenShareUUID - ID dello stream
   * @returns {Promise<void>}
   * @private
   */
  async _addScreenStreamToAllPeers(stream, screenShareUUID) {
    const peerConnections = this.globalState.getAllPeerConnections();

    for (const [peerId, pc] of Object.entries(peerConnections)) {
      if (
        pc.connectionState === "connected" ||
        pc.connectionState === "connecting"
      ) {
        try {
          stream.getTracks().forEach((track) => {
            // Use addTransceiver instead of addTrack for better control and MID registration
            const transceiver = pc.addTransceiver(track, {
              direction: "sendrecv",
              streams: [stream],
            });

            // 🔥 AGGIUNGI IL MAPPING AI PENDING INVECE CHE REGISTRARE SUBITO!
            const streamMappingManager =
              this.globalState.getStreamMappingManager?.();
            if (streamMappingManager) {
              const myParticipantId = this.globalState.getMyId();

              // ❌ NON FARE QUESTO - il MID è null!
              // streamMappingManager.registerLocalTransceiverMapping(...)

              // ✅ INVECE: Aggiungi ai pending mappings della peer connection
              if (!pc._pendingMappings) {
                pc._pendingMappings = [];
              }

              pc._pendingMappings.push({
                transceiver,
                remoteParticipantUUID: peerId,
                streamUUID: screenShareUUID,
              });

              this.logger.debug(
                "🔥 SCREEN SHARE MAPPING AGGIUNTO AI PENDING:",
                {
                  component: "ScreenShareManager",
                  peerId,
                  screenShareUUID,
                  trackKind: track.kind,
                  pendingCount: pc._pendingMappings.length,
                }
              );
            }
          });

          // 🔥 FORZA LA RINEGOZIAZIONE IMMEDIATA PER QUESTA PEER CONNECTION
          if (pc.signalingState === "stable") {
            this.logger.debug(
              "🔥 FORCING IMMEDIATE RENEGOTIATION FOR SCREEN SHARE:",
              {
                component: "ScreenShareManager",
                peerId,
                screenShareUUID,
              }
            );

            // Ottieni il PeerConnectionManager per gestire la rinegoziazione
            const peerConnectionManager =
              this.globalState.getPeerConnectionManager?.();
            if (peerConnectionManager) {
              // Chiama il metodo di rinegoziazione diretta
              await peerConnectionManager._performDirectRenegotiation(
                pc,
                peerId
              );

              this.logger.debug("🎉 SCREEN SHARE RENEGOTIATION COMPLETED:", {
                component: "ScreenShareManager",
                peerId,
                screenShareUUID,
              });
            }
          }

          this.logger.debug(
            `Stream screen share aggiunto alla connessione con ${peerId}`,
            {
              component: "ScreenShareManager",
              peerId,
              screenShareUUID,
            }
          );
        } catch (error) {
          this.logger.error(
            `Errore aggiungendo stream screen share alla connessione con ${peerId}`,
            {
              component: "ScreenShareManager",
              peerId,
              screenShareUUID,
              error: error.message,
            }
          );
        }
      }
    }
  }

  /**
   * Rimuove stream screen share da tutte le connessioni peer
   * @param {string} screenShareUUID - ID dello stream
   * @returns {Promise<void>}
   * @private
   */
  async _removeScreenStreamFromAllPeers(screenShareUUID) {
    const peerConnections = this.globalState.getAllPeerConnections();

    for (const [peerId, pc] of Object.entries(peerConnections)) {
      try {
        const senders = pc.getSenders();
        const screenSenders = senders.filter(
          (sender) =>
            sender.track &&
            sender.track.screenShareUUID === screenShareUUID &&
            sender.track.streamType === "screenshare"
        );

        for (const sender of screenSenders) {
          await pc.removeTrack(sender);

          this.logger.debug(
            `Traccia screen share rimossa dalla connessione con ${peerId}`,
            {
              component: "ScreenShareManager",
              peerId,
              screenShareUUID,
              trackId: sender.track.id,
            }
          );
        }
      } catch (error) {
        this.logger.error(
          `Errore rimuovendo stream screen share dalla connessione con ${peerId}`,
          {
            component: "ScreenShareManager",
            peerId,
            screenShareUUID,
            error: error.message,
          }
        );
      }
    }
  }

  /**
   * Rinegozia con tutti i peer
   * @returns {Promise<void>}
   * @private
   */
  async _renegotiateWithAllPeers() {
    // Questa funzionalità sarà implementata dal SignalingManager
    // Per ora logghiamo l'intenzione
    this.logger.debug("Richiesta rinegoziazione con tutti i peer", {
      component: "ScreenShareManager",
    });
  }

  /**
   * Pulisce pin se corrisponde allo screenShareUUID
   * @param {string} screenShareUUID - ID dello stream
   * @returns {void}
   * @private
   */
  _clearPinIfscreenShareUUID(screenShareUUID) {
    const pinManager = this.globalState.getPinManager();
    if (pinManager) {
      pinManager.clearPinIfUser(screenShareUUID);
    }
  }

  /**
   * Enhanced method to handle multiple concurrent screen shares with conflict resolution
   * @param {string} screenShareUUID - Original stream ID
   * @param {MediaStream} existingStream - Stream to register
   * @returns {Promise<Object|null>} - Returns screen share info or null if failed
   */
  async startScreenShare(screenShareUUID, existingStream = null) {
    const partecipantUUID = this.globalState.getMyId();

    this.logger.info("Avvio condivisione schermo", {
      component: "ScreenShareManager",
      screenShareUUID,
      hasExistingStream: !!existingStream,
      action: "startScreenShare",
    });

    try {
      // CRITICAL: We must have an existing stream - never regenerate
      if (!existingStream) {
        this.logger.error(
          "No existing stream provided - screen share cannot start without stream",
          {
            component: "ScreenShareManager",
            screenShareUUID,
          }
        );
        return null;
      }

      // Check if this screen share already exists
      const existingScreenStream = this.globalState.getActiveStream(
        partecipantUUID,
        screenShareUUID
      );

      if (existingScreenStream) {
        this.logger.warning("Screen share already exists, not recreating", {
          component: "ScreenShareManager",
          screenShareUUID,
        });
        return { screenShareUUID, stream: existingScreenStream };
      }

      this.globalState.addScreenShare(
        partecipantUUID,
        screenShareUUID,
        existingStream
      );

      this.logger.info(
        `Screen share added to userData with ID: ${partecipantUUID}`,
        {
          component: "ScreenShareManager",
          screenShareUUID: screenShareUUID,
          participantId: partecipantUUID,
          tracks: existingStream.getTracks().length,
        }
      );

      // Configura gestori eventi per fine condivisione usando resolved UUID
      this._setupStreamEndHandlers(existingStream, screenShareUUID);

      // Aggiungi stream a tutte le connessioni peer
      await this._addScreenStreamToAllPeers(existingStream, screenShareUUID);

      eventEmitter.sendLocalUpdateNeeded(
        partecipantUUID,
        screenShareUUID,
        existingStream
      );

      // Rinegozia con tutti i peer dopo un breve delay
      setTimeout(() => {
        this._renegotiateWithAllPeers();
      }, 100);

      return {
        screenShareUUID,
        stream: existingStream,
      };
    } catch (error) {
      this.logger.error("Errore avvio condivisione schermo", {
        component: "ScreenShareManager",
        screenShareUUID,
        error: error.message,
        errorName: error.name,
        stack: error.stack,
      });

      // Gestisci errori di permessi in modo silenzioso
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("Permission denied") ||
        error.message.includes("cancelled by user")
      ) {
        this.logger.info("Permessi screen share negati dall'utente", {
          component: "ScreenShareManager",
          errorType: "permission_denied",
        });
        return null; // Return null instead of throwing
      }

      throw error;
    }
  }
}

// Default export for Expo Router compatibility
export default ScreenShareManager;
