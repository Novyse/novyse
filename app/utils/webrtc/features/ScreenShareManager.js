import { Platform } from "react-native";
import WebRTCLogger from "../logging/WebRTCLogger.js";
import { GlobalState } from "../core/GlobalState.js";
import Compatibility from "../utils/compatibility.js";
import { Helpers } from "../utils/helpers.js";

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

    // Configurazioni screen share
    this.SCREEN_SHARE_CONSTRAINTS = {
      web: {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: true, // Include system audio if available
      },
      android: {
        video: {
          width: { ideal: 1920, min: 720, max: 1920 },
          height: { ideal: 1080, min: 480, max: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false, // Audio capture often causes issues on Android
      },
    };

    this.logger.debug("ScreenShareManager inizializzato", {
      component: "ScreenShareManager",
      platform: Platform.OS,
    });
  }

  /**
   * Aggiunge un nuovo stream screen share - metodo wrapper per startScreenShare
   * Chiamato dal WebRTCManager per compatibilità API
   * @param {string} screenShareUUID - ID screen share dal server API
   * @param {MediaStream} existingStream - Stream esistente opzionale
   * @returns {Promise<Object|null>} { screenShareUUID, stream } o null se fallisce
   */
  async addScreenShareStream(screenShareUUID, existingStream = null) {
    return await this.startScreenShare(screenShareUUID, existingStream);
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

    const screenStream = this.globalState.getActiveStream(this.globalState.getMyId(),screenShareUUID);
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

      // Invia notifica signaling se WebSocket disponibile
      await this._notifyScreenShareStopped(screenShareUUID);

      // Pulisci pin se questo stream era pinnato
      this.pinManager.clearPinIfId(screenShareUUID);

      // Notifica UI components about screen share removal
      this._notifyLocalScreenShareStopped(screenShareUUID);

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
   * Ottiene tutti gli stream screen share attivi
   * @returns {Object} Oggetto contenente tutti gli stream screen share
   */
  getActiveScreenShares() {
    return this.getScreenShareStreams();
  }

  /**
   * Verifica se ci sono condivisioni schermo attive
   * @returns {boolean}
   */
  hasActiveScreenShare() {
    const screenStreams = this.getActiveScreenShares();
    return Object.keys(screenStreams).length > 0;
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

    const screenStreams = {}; //this.getActiveScreenShares();
    const screenShareUUIDs = Object.keys(screenStreams);

    for (const screenShareUUID of screenShareUUIDs) {
      await this.stopScreenShare(screenShareUUID);
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

      // Notifica update
      this._notifyStreamUpdate();
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
  async _acquireScreenStream() {
    this.logger.debug("Acquisizione stream screen share", {
      component: "ScreenShareManager",
      platform: Platform.OS,
    });

    if (Platform.OS === "web") {
      return await this._acquireWebScreenStream();
    } else {
      return await this._acquireAndroidScreenStream();
    }
  }

  /**
   * Acquisisce stream screen share su web
   * @returns {Promise<MediaStream|null>}
   * @private
   */
  async _acquireWebScreenStream() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("getDisplayMedia non supportato");
      }

      const constraints = this.SCREEN_SHARE_CONSTRAINTS.web;
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

      this.logger.debug("Stream screen share web acquisito", {
        component: "ScreenShareManager",
        screenShareUUID: stream.id,
        tracks: stream.getTracks().length,
      });

      return stream;
    } catch (error) {
      this.logger.error("Errore acquisizione screen share web", {
        component: "ScreenShareManager",
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Acquisisce stream screen share su Android
   * @returns {Promise<MediaStream|null>}
   * @private
   */
  async _acquireAndroidScreenStream() {
    let screenStream = null;

    try {
      // Metodo 1: getDisplayMedia (react-native-webrtc)
      if (mediaDevices.getDisplayMedia) {
        try {
          this.logger.debug("Tentativo getDisplayMedia Android", {
            component: "ScreenShareManager",
          });

          const constraints = this.SCREEN_SHARE_CONSTRAINTS.android;
          screenStream = await mediaDevices.getDisplayMedia(constraints);

          this.logger.debug("getDisplayMedia Android riuscito", {
            component: "ScreenShareManager",
          });
        } catch (displayError) {
          if (
            displayError.name === "NotAllowedError" ||
            displayError.message.includes("Permission denied") ||
            displayError.message.includes("cancelled by user")
          ) {
            throw displayError; // Re-throw permission errors
          }

          this.logger.warning("getDisplayMedia Android fallito", {
            component: "ScreenShareManager",
            error: displayError.message,
          });
          screenStream = null;
        }
      }

      // Metodo 2: getUserMedia con source screen
      if (!screenStream && mediaDevices.getUserMedia) {
        try {
          this.logger.debug("Tentativo getUserMedia con screen source", {
            component: "ScreenShareManager",
          });

          screenStream = await mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: "screen",
                maxWidth: 1920,
                maxHeight: 1080,
                maxFrameRate: 15,
              },
            },
            audio: false,
          });

          this.logger.debug("getUserMedia con screen source riuscito", {
            component: "ScreenShareManager",
          });
        } catch (screenError) {
          if (
            screenError.name === "NotAllowedError" ||
            screenError.message.includes("Permission denied") ||
            screenError.message.includes("cancelled by user")
          ) {
            throw screenError; // Re-throw permission errors
          }

          this.logger.warning("getUserMedia con screen source fallito", {
            component: "ScreenShareManager",
            error: screenError.message,
          });
          screenStream = null;
        }
      }

      // Metodo 3: Fallback camera di alta qualità
      if (!screenStream) {
        this.logger.info("Fallback camera per screen sharing Android", {
          component: "ScreenShareManager",
        });

        try {
          screenStream = await mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920, min: 720 },
              height: { ideal: 1080, min: 480 },
              frameRate: { ideal: 30, min: 15 },
              facingMode: { ideal: "environment" }, // Back camera typically better quality
            },
            audio: false,
          });

          // Marca le tracce come screen share per identificazione
          screenStream.getTracks().forEach((track) => {
            track.label = `screen-share-fallback-${Date.now()}`;
          });

          this.logger.info("Camera fallback per screen sharing attivata", {
            component: "ScreenShareManager",
          });
        } catch (cameraError) {
          this.logger.error("Anche camera fallback fallita", {
            component: "ScreenShareManager",
            error: cameraError.message,
          });
          throw new Error(
            "Impossibile ottenere stream per screen sharing su Android"
          );
        }
      }

      return screenStream;
    } catch (error) {
      this.logger.error("Errore acquisizione screen share Android", {
        component: "ScreenShareManager",
        error: error.message,
      });
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
        try {
          const apiMethods = this.globalState.getAPIMethods();
          if (apiMethods) {
            await apiMethods.stopScreenShare(
              this.globalState.getChatId(),
              screenShareUUID
            );
          }
        } catch (error) {
          this.logger.error("Errore chiamando API stopScreenShare", {
            component: "ScreenShareManager",
            screenShareUUID,
            error: error.message,
          });
        }

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
            // Add custom properties for identification - keep full screenShareUUID
            track.screenShareUUID = screenShareUUID; // Keep full participantId_streamId format
            track.streamType = "screenshare";

            // Use addTransceiver instead of addTrack for better control and MID registration
            const transceiver = pc.addTransceiver(track, {
              direction: "sendrecv",
              streams: [stream],
            });
            // Register the mapping in StreamMappingManager if available
            const streamMappingManager =
              this.globalState.getStreamMappingManager?.();
            if (streamMappingManager && transceiver.mid) {
              const myParticipantId = this.globalState.getMyId();

              // Extract the screen share ID from the full screenShareUUID for mapping generation
              // screenShareUUID format: participantId_screenShareId
              const screenShareId = screenShareUUID.includes("_")
                ? screenShareUUID.split("_").slice(1).join("_")
                : screenShareUUID;

              const streamUUID = streamMappingManager.generateStreamUUID(
                myParticipantId,
                "screenshare",
                screenShareId // Use extracted screen share ID
              );

              streamMappingManager.registerLocalTransceiverMapping(
                transceiver,
                streamUUID,
                "screenshare",
                myParticipantId
              );

              this.logger.debug(
                `Registered screen share mapping: MID ${transceiver.mid} -> ${streamUUID}`,
                {
                  component: "ScreenShareManager",
                  mid: transceiver.mid,
                  streamUUID,
                  screenShareUUID,
                }
              );
            }
          });

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
   * Invia notifica signaling per screen share avviato
   * @param {string} screenShareUUID - ID dello stream
   * @returns {Promise<void>}
   * @private
   */
  async _notifyScreenShareStarted(screenShareUUID) {
    try {
      // Usa direttamente webSocketMethods importandolo
      const webSocketMethods = await import("../../webSocketMethods.js");
      await webSocketMethods.default.sendScreenShareStarted(
        this.globalState.getChatId(),
        this.globalState.getMyId(),
        screenShareUUID
      );

      this.logger.debug("Notifica screen share started inviata", {
        component: "ScreenShareManager",
        screenShareUUID,
      });
    } catch (error) {
      this.logger.error("Errore inviando notifica screen share started", {
        component: "ScreenShareManager",
        screenShareUUID,
        error: error.message,
      });
    }
  }

  /**
   * Invia notifica signaling per screen share fermato
   * @param {string} screenShareUUID - ID dello stream
   * @returns {Promise<void>}
   * @private
   */
  async _notifyScreenShareStopped(screenShareUUID) {
    try {
      // Usa direttamente webSocketMethods importandolo
      const webSocketMethods = await import("../../webSocketMethods.js");
      await webSocketMethods.default.sendScreenShareStopped(
        this.globalState.getChatId(),
        this.globalState.getMyId(),
        screenShareUUID
      );

      this.logger.debug("Notifica screen share stopped inviata", {
        component: "ScreenShareManager",
        screenShareUUID,
      });
    } catch (error) {
      this.logger.error("Errore inviando notifica screen share stopped", {
        component: "ScreenShareManager",
        screenShareUUID,
        error: error.message,
      });
    }
  }

  /**
   * Notifica update degli stream all'UI
   * @returns {void}
   * @private
   */
  _notifyStreamUpdate() {
    const callback = this.globalState.getCallback("onStreamUpdate");
    if (callback) {
      callback();
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
   * Get all screen share streams
   * @returns {Object} Object containing all screen share streams
   */
  getScreenShareStreams() {
    return this.globalState.getAllScreenStreams();
  }

  /**
   * Notify local UI about screen share started for creating rectangles in VocalContent
   * @param {string} screenShareUUID - Stream ID
   * @param {MediaStream} stream - The screen stream
   * @returns {void}
   * @private
   */
  _notifyLocalScreenShareStarted(screenShareUUID, stream) {
    try {
      // Import EventEmitter to notify VocalContent
      const eventEmitter = require("../../EventEmitter.js").default;

      const myParticipantId = this.globalState.getMyId();

      // Emit stream_added_or_updated event for local screen share
      eventEmitter.emit("stream_added_or_updated", {
        participantUUID: myParticipantId, 
        stream, 
        streamUUID: screenShareUUID,
        timestamp: Date.now(),
      });

      this.logger.debug("Local screen share notification sent to UI", {
        component: "ScreenShareManager",
        screenShareUUID,
        participantId: myParticipantId,
      });
    } catch (error) {
      this.logger.error("Error notifying local UI about screen share", {
        component: "ScreenShareManager",
        screenShareUUID,
        error: error.message,
      });
    }
  }

  /**
   * Notify local UI about screen share stopped for removing rectangles in VocalContent
   * @param {string} screenShareUUID - Stream ID
   * @returns {void}
   * @private
   */
  _notifyLocalScreenShareStopped(screenShareUUID) {
    try {
      // Import EventEmitter to notify VocalContent
      const eventEmitter = require("../../EventEmitter.js").default;

      const myParticipantId = this.globalState.getMyId();

      // Emit screen_share_stopped event for local screen share
      eventEmitter.emit("screen_share_stopped", {
        from: myParticipantId,
        screenShareUUID: screenShareUUID,
        chatId: this.globalState.getChatId(),
      });

      this.logger.debug("Local screen share stopped notification sent to UI", {
        component: "ScreenShareManager",
        screenShareUUID,
        participantId: myParticipantId,
      });
    } catch (error) {
      this.logger.error("Error notifying local UI about screen share stop", {
        component: "ScreenShareManager",
        screenShareUUID,
        error: error.message,
      });
    }
  }

  /**
   * Resolve UUID conflicts for concurrent screen shares
   * @param {string} baseScreenShareUUID - Base UUID to check for conflicts
   * @returns {string} - Unique UUID that doesn't conflict
   * @private
   */
  _resolveUUIDConflicts(baseScreenShareUUID) {
    const existingScreenStreams = this.globalState.getAllScreenStreams();
    let uniqueUUID = baseScreenShareUUID;
    let counter = 1;

    // Keep checking until we find a unique UUID
    while (existingScreenStreams[uniqueUUID]) {
      uniqueUUID = `${baseScreenShareUUID}_${counter}`;
      counter++;

      // Safety check to prevent infinite loops
      if (counter > 100) {
        this.logger.warning("UUID conflict resolution reached max attempts", {
          component: "ScreenShareManager",
          baseUUID: baseScreenShareUUID,
          finalUUID: uniqueUUID,
        });
        break;
      }
    }

    if (uniqueUUID !== baseScreenShareUUID) {
      this.logger.info("UUID conflict resolved", {
        component: "ScreenShareManager",
        originalUUID: baseScreenShareUUID,
        resolvedUUID: uniqueUUID,
        conflictCounter: counter - 1,
      });
    }

    return uniqueUUID;
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
      const existingScreenStream =
        this.globalState.getActiveStream(partecipantUUID,screenShareUUID);

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
      this._setupStreamEndHandlers(existingStream, partecipantUUID);

      // Aggiungi stream a tutte le connessioni peer
      await this._addScreenStreamToAllPeers(
        existingStream,
        screenShareUUID
      );

      // Invia notifica signaling se WebSocket disponibile
      await this._notifyScreenShareStarted(screenShareUUID);

      // Notify local UI about screen share addition for rectangle creation
      this._notifyLocalScreenShareStarted(
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
