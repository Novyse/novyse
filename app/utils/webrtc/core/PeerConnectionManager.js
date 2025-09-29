import {
  RTCPeerConnection,
  createMediaStream,
} from "../utils/compatibility.js";
import { getWebRTCConfiguration } from "../config/configuration.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";
import { GlobalState } from "./GlobalState.js";
import logger from "../logging/WebRTCLogger.js";
import {
  getPeerConnectionInfo,
  isConnectionHealthy,
  isConnectionFailed,
} from "../utils/helpers.js";
import EventEmitter from "../utils/EventEmitter.js";
import { Platform } from "react-native";

/**
 * Gestisce la creazione, configurazione e chiusura delle peer connections
 */
class PeerConnectionManager {
  constructor(globalState, streamMappingManager) {
    this.configuration = getWebRTCConfiguration();
    this.globalState = globalState || new GlobalState();
    this.streamMappingManager = streamMappingManager;
    this.midToScreenShareMap = new Map();
    logger.info(
      "PeerConnectionManager",
      "Inizializzato con configurazione WebRTC"
    );
  }

  /**
   * Crea una nuova peer connection per un partecipante
   * @param {Object} participant - Dati del partecipante
   * @returns {RTCPeerConnection|null} La peer connection creata
   */
  createPeerConnection(participant) {
    const deviceUUID = participant.from;

    if (this.globalState.getPeerConnection(deviceUUID)) {
      logger.warning(
        "PeerConnectionManager",
        `Connessione peer per ${deviceUUID} esiste già`
      );
      return this.globalState.getPeerConnection(deviceUUID);
    }

    logger.info(
      "PeerConnectionManager",
      `Creazione PeerConnection per ${deviceUUID}`
    );

    try {
      const pc = new RTCPeerConnection(this.configuration);
      const userData = {
        handle: participant.handle,
        isSpeaking: false,
      };

      // Specifica codec
      this._setAudioCodec(pc);

      // Salva nel global state
      this.globalState.addPeerConnection(deviceUUID, pc, userData);
      this.globalState.initializeConnectionTracking(deviceUUID);

      // Configura event handlers
      this._setupPeerConnectionEventHandlers(pc, deviceUUID);

      logger.info(
        "PeerConnectionManager",
        `PeerConnection per ${deviceUUID} creata con successo`
      );
      return pc;
    } catch (error) {
      logger.error(
        "PeerConnectionManager",
        `Errore creazione PeerConnection per ${deviceUUID}:`,
        error
      );
      this.globalState.removePeerConnection(deviceUUID);
      return null;
    }
  }

  _setAudioCodec(pc) {
    try {
      const transceivers = pc.getTransceivers();
      transceivers.forEach((transceiver) => {
        if (transceiver.sender?.track?.kind === "audio") {
          const capabilities = RTCRtpSender.getCapabilities("audio");
          if (capabilities) {
            // Metti Opus primo (migliore qualità)
            const codecs = capabilities.codecs.sort((a, b) => {
              if (a.mimeType === "audio/opus") return -1;
              if (b.mimeType === "audio/opus") return 1;
              return 0;
            });
            transceiver.setCodecPreferences(codecs);
          }
        }
      });
    } catch (error) {
      // Se non funziona, pazienza - il browser usa quello di default
      console.log("Codec preference non supportato:", error);
    }
  }

  /**
   * Configura gli event handlers per una peer connection
   * @param {RTCPeerConnection} pc
   * @param {string} deviceUUID
   */ _setupPeerConnectionEventHandlers(pc, deviceUUID) {
    // Use ICEManager for ICE-related events if available
    if (this.iceManager) {
      this.iceManager.setupICEEventHandlers(pc, deviceUUID);
    } else {
      // Fallback to direct ICE candidate handling
      pc.onicecandidate = async (event) => {
        await this._handleIceCandidate(event, deviceUUID);
      };

      pc.oniceconnectionstatechange = () => {
        this._handleIceConnectionStateChange(pc, deviceUUID);
      };

      pc.onicegatheringstatechange = () => {
        this._handleIceGatheringStateChange(pc, deviceUUID);
      };
    }

    pc.onnegotiationneeded = async (event) => {
      console.log("🔄 NEGOTIATION NEEDED!", {
        deviceUUID,
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
        transceivers: pc.getTransceivers().length,
        senders: pc.getSenders().length,
        sendersWithTracks: pc.getSenders().filter((s) => s.track).length,
        sendersTrackTypes: pc
          .getSenders()
          .filter((s) => s.track)
          .map((s) => s.track.kind),
        // 🔥 AGGIUNGI CONTROLLO STATO RINEGOZIAZIONE
        isRenegotiating: pc._isRenegotiating || false,
      });

      logger.info(
        "PeerConnectionManager",
        `🔄 Negotiation needed for ${deviceUUID}`,
        {
          signalingState: pc.signalingState,
          transceivers: pc.getTransceivers().length,
          senders: pc.getSenders().length,
          sendersWithTracks: pc.getSenders().filter((s) => s.track).length,
        }
      );

      // 🔥 FIX PRINCIPALE: Non fare rinegoziazione se stiamo già processando offer/answer
      if (pc._isRenegotiating) {
        console.log("⏭️ SKIPPING RENEGOTIATION - already in progress:", {
          deviceUUID,
          signalingState: pc.signalingState,
        });
        return;
      }

      // Se siamo in stato stabile e non stiamo già negoziando
      if (pc.signalingState === "stable") {
        try {
          console.log("🚀 CREATING RENEGOTIATION OFFER DIRECTLY:", {
            deviceUUID,
          });

          // 🔥 MARCA CHE STIAMO RINEGOZIANDO
          pc._isRenegotiating = true;

          await this._performDirectRenegotiation(pc, deviceUUID);
        } catch (error) {
          logger.error(
            "PeerConnectionManager",
            `Error during renegotiation for ${deviceUUID}:`,
            error
          );
          console.error("❌ RENEGOTIATION ERROR:", { deviceUUID, error });
        } finally {
          // 🔥 RESET FLAG ANCHE IN CASO DI ERRORE
          pc._isRenegotiating = false;
        }
      } else {
        console.log("⏳ SKIPPING RENEGOTIATION - not in stable state:", {
          deviceUUID,
          signalingState: pc.signalingState,
        });
      }
    };

    // Track handler per stream remoti
    pc.ontrack = (event) => {
      this._handleRemoteTrack(event, deviceUUID);
    };

    // Connection state handlers (non-ICE)
    pc.onconnectionstatechange = () => {
      this._handleConnectionStateChange(pc, deviceUUID);
    };

    pc.onsignalingstatechange = () => {
      this._handleSignalingStateChange(pc, deviceUUID);
    };

    logger.debug(
      "PeerConnectionManager",
      `Event handlers configurati per ${deviceUUID}`
    );
  }
  /**
   * Gestisce ICE candidates
   */
  async _handleIceCandidate(event, deviceUUID) {
    if (event.candidate) {
      logger.debug(
        "PeerConnectionManager",
        `ICE candidate generato per ${deviceUUID}:`,
        {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
        }
      );

      // Retry mechanism for ICE candidate sending
      const success = await this._sendICECandidateWithRetry(
        event.candidate,
        deviceUUID,
        3
      );

      if (!success) {
        logger.warn(
          "PeerConnectionManager",
          `Failed to send ICE candidate to ${deviceUUID} after retries`
        );
      }
    } else {
      logger.debug(
        "PeerConnectionManager",
        `ICE gathering completato per ${deviceUUID}`
      );
    }
  }

  /**
   * Esegue rinegoziazione direttamente senza SignalingManager
   */
  async _performDirectRenegotiation(pc, deviceUUID) {
    try {
      console.log("📝 STARTING DIRECT RENEGOTIATION:", {
        deviceUUID,
        currentSignalingState: pc.signalingState,
        currentTransceivers: pc.getTransceivers().length,
        currentSenders: pc.getSenders().length,
      });

      // 1. Aggiungi tutte le tracce locali che non sono ancora state aggiunte
      this._addLocalTracksIfAvailable(pc, deviceUUID, false);

      // 2. Crea nuova offer
      console.log("🎯 CREATING NEW OFFER FOR RENEGOTIATION...");
      const offer = await pc.createOffer();

      console.log("✅ OFFER CREATED:", {
        deviceUUID,
        hasOffer: !!offer,
        offerType: offer?.type,
        sdpLength: offer?.sdp?.length || 0,
      });

      // 3. Imposta local description
      await pc.setLocalDescription(offer);

      console.log("✅ LOCAL DESCRIPTION SET:", {
        deviceUUID,
        newSignalingState: pc.signalingState,
        hasLocalDescription: !!pc.localDescription,
      });

      // 4. Processa mapping dopo aver impostato la local description
      this.processPendingMappingsAfterOffer(pc);

      // 5. Invia offer via WebSocket
      console.log("📡 SENDING RENEGOTIATION OFFER VIA WEBSOCKET...");

      const SocketIO = await import("../../backend-services/socket-io.js");
      await SocketIO.default.RTCOffer({
        offer: offer,
        to: deviceUUID,
        from: this.globalState.getDeviceUUID(),
      });

      console.log("🎉 RENEGOTIATION OFFER SENT SUCCESSFULLY:", {
        deviceUUID,
        from: this.globalState.getDeviceUUID(),
      });

      logger.info(
        "PeerConnectionManager",
        `✅ Renegotiation offer sent for ${deviceUUID}`,
        {
          signalingState: pc.signalingState,
          transceivers: pc.getTransceivers().length,
          senders: pc.getSenders().length,
        }
      );
    } catch (error) {
      console.error("❌ DIRECT RENEGOTIATION FAILED:", {
        deviceUUID,
        error: error.message,
        stack: error.stack,
      });

      logger.error(
        "PeerConnectionManager",
        `❌ Direct renegotiation failed for ${deviceUUID}:`,
        error
      );

      throw error;
    }
  }

  // Add method to register a mid mapping
  registerScreenShareMid(deviceUUID, mid, screenShareUUID) {
    const key = `${deviceUUID}_${mid}`;
    this.midToScreenShareMap.set(key, screenShareUUID);
    logger.debug(
      "PeerConnectionManager",
      `Registered screen share mapping: ${key} → ${screenShareUUID}`
    );
  }
  /**
   * Gestisce tracce remote ricevute - VERSIONE CON MAPPING MANAGER
   */
  _handleRemoteTrack(event, deviceUUID) {
    if (!deviceUUID) {
      logger.error("PeerConnectionManager", "❌ deviceUUID mancante");
      return;
    }

    if (!event.transceiver || !event.transceiver.mid) {
      logger.error("PeerConnectionManager", "❌ Transceiver o MID mancante", {
        hasTransceiver: !!event.transceiver,
        mid: event.transceiver?.mid,
      });
      return;
    }

    logger.info(
      "PeerConnectionManager",
      `🎯 Traccia ricevuta da ${deviceUUID}`,
      {
        trackKind: event.track.kind,
        trackId: event.track.id,
        transceiverMid: event.transceiver.mid,
      }
    );

    // 🔥 CERCA IL MAPPING NEL StreamMappingManager
    const streamUUID = this.streamMappingManager?.getStreamUUIDByMid(
      deviceUUID,
      event.transceiver.mid
    );

    if (streamUUID) {
      // 3.1 - MAPPING TROVATO: Processa subito la traccia
      console.log("✅ MAPPING TROVATO SUBITO!", {
        deviceUUID,
        mid: event.transceiver.mid,
        streamUUID,
        trackKind: event.track.kind,
      });

      logger.info(
        "PeerConnectionManager",
        `✅ Mapping trovato per MID ${event.transceiver.mid}`,
        {
          deviceUUID,
          streamUUID,
          trackKind: event.track.kind,
        }
      );

      // Processa la traccia con lo streamUUID trovato
      this._processTrackWithStreamUUID(event, deviceUUID, streamUUID);
    } else {
      // 3.2 - MAPPING NON TROVATO: Aspetta e riprova
      console.log("⏳ MAPPING NON TROVATO, ASPETTO...", {
        deviceUUID,
        mid: event.transceiver.mid,
        trackKind: event.track.kind,
        availableMappings: this.streamMappingManager?.getAllMappings(),
      });

      logger.warning(
        "PeerConnectionManager",
        `⏳ Mapping non trovato per MID ${event.transceiver.mid}, aspetto signaling...`,
        {
          deviceUUID,
          transceiverMid: event.transceiver.mid,
          trackKind: event.track.kind,
        }
      );

      // Aspetta che il mapping arrivi via signaling WebSocket
      this._waitForMappingFromSignaling(event, deviceUUID, 0);
    }
  }

  /**
   * Aspetta che il mapping arrivi via signaling WebSocket
   */
  _waitForMappingFromSignaling(event, deviceUUID, attemptCount) {
    const maxAttempts = 200; // 10 secondi (200 x 50ms) - più tempo per il signaling

    if (attemptCount >= maxAttempts) {
      logger.error(
        "PeerConnectionManager",
        `❌ Mapping non arrivato dopo ${maxAttempts * 50}ms via signaling`,
        {
          deviceUUID,
          transceiverMid: event.transceiver.mid,
          trackKind: event.track.kind,
          finalMappings: this.streamMappingManager?.getAllMappings(),
        }
      );

      console.log("❌ TIMEOUT MAPPING!", {
        deviceUUID,
        mid: event.transceiver.mid,
        waitedMs: maxAttempts * 50,
        finalMappings: this.streamMappingManager?.getAllMappings(),
      });
      return;
    }

    setTimeout(() => {
      // Ricontrolla se il mapping è arrivato via WebSocket
      const streamUUID = this.streamMappingManager?.getStreamUUIDByMid(
        deviceUUID,
        event.transceiver.mid
      );

      if (streamUUID) {
        // MAPPING FINALMENTE ARRIVATO!
        console.log("🎉 MAPPING ARRIVATO DOPO ATTESA!", {
          deviceUUID,
          mid: event.transceiver.mid,
          streamUUID,
          waitedMs: attemptCount * 50,
          attempts: attemptCount + 1,
        });

        logger.info(
          "PeerConnectionManager",
          `✅ Mapping ricevuto via signaling dopo ${attemptCount * 50}ms`,
          {
            deviceUUID,
            streamUUID,
            transceiverMid: event.transceiver.mid,
            attempts: attemptCount + 1,
          }
        );

        // Processa la traccia con il mapping ricevuto
        this._processTrackWithStreamUUID(event, deviceUUID, streamUUID);
      } else {
        // Continua ad aspettare
        if (attemptCount % 20 === 0) {
          // Log ogni secondo
          console.log("⏳ ANCORA IN ATTESA MAPPING...", {
            deviceUUID,
            mid: event.transceiver.mid,
            attemptCount: attemptCount + 1,
            waitedMs: (attemptCount + 1) * 50,
          });
        }

        this._waitForMappingFromSignaling(event, deviceUUID, attemptCount + 1);
      }
    }, 50);
  }

  /**
   * Processa la traccia con lo streamUUID
   */
  _processTrackWithStreamUUID(event, deviceUUID, streamUUID) {
    logger.info(
      "PeerConnectionManager",
      `🔄 Processing track con streamUUID ${streamUUID}`,
      {
        deviceUUID,
        streamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Controlla se esiste già uno stream con questo UID
    let existingStream = this.globalState.getActiveStream(
      deviceUUID,
      streamUUID
    );

    if (existingStream) {
      logger.info(
        "PeerConnectionManager",
        `🔗 Aggiunta traccia a stream esistente`,
        {
          deviceUUID,
          streamUUID,
          trackKind: event.track.kind,
          existingTracks: existingStream.getTracks().length,
        }
      );

      // Verifica che la traccia non sia già presente nello stream
      const trackExists = existingStream
        .getTracks()
        .find((t) => t.id === event.track.id);

      if (!trackExists) {
        existingStream.addTrack(event.track);

        logger.info(
          "PeerConnectionManager",
          `✅ Traccia aggiunta a stream esistente`,
          {
            deviceUUID,
            streamUUID,
            trackKind: event.track.kind,
            totalTracks: existingStream.getTracks().length,
          }
        );
      } else {
        logger.info(
          "PeerConnectionManager",
          `⚠️ Traccia già presente nello stream`,
          {
            deviceUUID,
            streamUUID,
            trackId: event.track.id,
          }
        );
      }
    } else {
      logger.info(
        "PeerConnectionManager",
        `✨ Creazione nuovo stream per streamUUID ${streamUUID}`,
        {
          deviceUUID,
          streamUUID,
          trackKind: event.track.kind,
        }
      );

      // Crea nuovo stream con la traccia
      const newStream = createMediaStream();
      newStream.addTrack(event.track);
      existingStream = newStream;

      // Determina il tipo di stream e aggiungilo al globalState
      if (streamUUID !== deviceUUID) {
        // È uno screen share (streamUUID diverso dal deviceUUID)
        this.globalState.addScreenShare(deviceUUID, streamUUID, existingStream);

        logger.info("PeerConnectionManager", `🖥️ Screen share stream creato`, {
          deviceUUID,
          streamUUID,
          trackKind: event.track.kind,
        });
      } else {
        // È stream principale (webcam/audio)
        this.globalState.addActiveStream(
          deviceUUID,
          streamUUID,
          existingStream
        );

        logger.info("PeerConnectionManager", `📹 Stream principale creato`, {
          deviceUUID,
          streamUUID,
          trackKind: event.track.kind,
        });
      }
    }

    // Gestisci audio context per tracce audio
    if (event.track.kind === "audio") {
      logger.info(
        "PeerConnectionManager",
        `🔊 Aggiunta audio all'AudioContext`,
        {
          deviceUUID,
          streamUUID,
        }
      );

      if (Platform.OS === "web") {
        if (this.globalState.audioContextRef) {
          this.globalState.audioContextRef.addAudio(deviceUUID, existingStream);
        }
      }
    }

    // Emetti evento per notificare l'aggiornamento dello stream
    EventEmitter.sendLocalUpdateNeeded(
      deviceUUID,
      streamUUID,
      existingStream,
      "add_or_update"
    );

    // Determina il tipo di stream per il log finale
    const streamType = streamUUID !== deviceUUID ? "screenshare" : "webcam";
    const audioTracks = existingStream.getAudioTracks().length;
    const videoTracks = existingStream.getVideoTracks().length;

    logger.info("PeerConnectionManager", `✅ Traccia elaborata con successo`, {
      deviceUUID,
      streamUUID,
      trackKind: event.track.kind,
      streamType,
      totalTracks: existingStream.getTracks().length,
      audioTracks,
      videoTracks,
    });
  }
  /**
   * Gestisce tracce webcam/audio (stesso stream)
   */
  _handleWebcamTrack(event, deviceUUID, streamUUID = null) {
    const finalStreamUUID = deviceUUID;

    logger.info(
      "PeerConnectionManager",
      `🎥 Gestione traccia webcam/audio per ${deviceUUID}`,
      {
        streamUUID: finalStreamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Ottieni o crea lo stream principale per questo partecipante
    let mainStream = this.globalState.getActiveStream(
      deviceUUID,
      finalStreamUUID
    );

    if (!mainStream) {
      mainStream = createMediaStream();
      this.globalState.addActiveStream(deviceUUID, finalStreamUUID, mainStream);
      logger.info(
        "PeerConnectionManager",
        `✨ Nuovo stream principale creato per ${deviceUUID}`,
        {
          streamUUID: finalStreamUUID,
        }
      );
    }

    // Aggiungi la traccia allo stream principale
    mainStream.addTrack(event.track);

    logger.info(
      "PeerConnectionManager",
      `➕ Traccia aggiunta allo stream principale`,
      {
        deviceUUID,
        streamUUID: finalStreamUUID,
        trackKind: event.track.kind,
        totalTracks: mainStream.getTracks().length,
        audioTracks: mainStream.getAudioTracks().length,
        videoTracks: mainStream.getVideoTracks().length,
      }
    );

    // Se è una traccia audio, aggiungila sempre all'AudioContext
    if (event.track.kind === "audio") {
      if (this.globalState.audioContextRef) {
        logger.info(
          "PeerConnectionManager",
          `🔊 Aggiunta audio all'AudioContext per ${deviceUUID}`
        );
        this.globalState.audioContextRef.addAudio(deviceUUID, mainStream);
      } else {
        logger.warning(
          "PeerConnectionManager",
          `⚠️ AudioContext non disponibile per ${deviceUUID}`,
          {
            audioContextRef: !!this.globalState.audioContextRef,
          }
        );
      }
    }

    // Setup event handlers per la traccia
    this._setupTrackEventHandlers(
      event.track,
      deviceUUID,
      "webcam",
      finalStreamUUID
    );

    // Notifica che lo stream è stato aggiornato
    EventEmitter.sendLocalUpdateNeeded(deviceUUID, finalStreamUUID, mainStream);
  }

  /**
   * Gestisce tracce screen share (stream separati)
   */
  _handleScreenShareTrack(event, deviceUUID, streamUUID) {
    logger.info(
      "PeerConnectionManager",
      `🖥️ Gestione traccia screen share per ${deviceUUID}`,
      {
        streamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Ottieni o crea lo stream screen share
    let screenStream = this.globalState.getActiveStream(deviceUUID, streamUUID);

    if (!screenStream) {
      screenStream = createMediaStream();
      this.globalState.addActiveStream(deviceUUID, streamUUID, screenStream);
      logger.info(
        "PeerConnectionManager",
        `✨ Nuovo stream screen share creato`,
        {
          deviceUUID,
          streamUUID,
        }
      );
    }

    // Aggiungi la traccia allo stream screen share
    screenStream.addTrack(event.track);

    logger.info("PeerConnectionManager", `➕ Traccia screen share aggiunta`, {
      deviceUUID,
      streamUUID,
      trackKind: event.track.kind,
      totalTracks: screenStream.getTracks().length,
    });

    // Aggiorna userData per includere questo screen share
    this.globalState.addScreenShare(deviceUUID, streamUUID, screenStream);

    // Setup event handlers per la traccia
    this._setupTrackEventHandlers(
      event.track,
      deviceUUID,
      "screenshare",
      streamUUID
    );
    EventEmitter.sendLocalUpdateNeeded(deviceUUID, streamUUID, screenStream);
  }

  /**
   * Configura event handlers per le tracce
   */
  _setupTrackEventHandlers(
    track,
    deviceUUID = null,
    streamType = null,
    streamUUID = null
  ) {
    track.onended = () => {
      logger.debug("PeerConnectionManager", "Traccia remota terminata:", {
        trackId: track.id,
        deviceUUID,
        streamType,
        streamUUID,
      });

      // 🔥 RIMUOVI MAPPING QUANDO LA TRACCIA TERMINA
      if (deviceUUID && this.streamMappingManager) {
        // Trova il MID associato a questa traccia
        const pc = this.globalState.getPeerConnection(deviceUUID);
        if (pc) {
          const transceivers = pc.getTransceivers();
          const transceiver = transceivers.find(
            (t) =>
              t.receiver && t.receiver.track && t.receiver.track.id === track.id
          );

          if (transceiver && transceiver.mid) {
            // Rimuovi il mapping per questo MID
            this.streamMappingManager.removeMappingByMid(
              deviceUUID,
              transceiver.mid
            );

            logger.info(
              "PeerConnectionManager",
              "🗑️ Mapping rimosso per traccia terminata",
              {
                deviceUUID,
                trackId: track.id,
                mid: transceiver.mid,
                streamType,
                streamUUID,
              }
            );
          } else {
            logger.warning(
              "PeerConnectionManager",
              "⚠️ Non trovato transceiver per traccia terminata",
              {
                deviceUUID,
                trackId: track.id,
                streamType,
                streamUUID,
              }
            );
          }
        }
      }
      EventEmitter.sendLocalUpdateNeeded(
        deviceUUID,
        streamUUID,
        this.globalState.getActiveStream(deviceUUID, streamUUID),
        "remove"
      );
    };

    track.onmute = () => {
      logger.debug("PeerConnectionManager", "Traccia remota mutata:", track.id);
    };

    track.onunmute = () => {
      logger.debug(
        "PeerConnectionManager",
        "Traccia remota smutata:",
        track.id
      );
    };
  }

  /**
   * Gestisce cambi di stato della connessione ICE
   */
  _handleIceConnectionStateChange(pc, deviceUUID) {
    const state = pc.iceConnectionState;
    logger.info(
      "PeerConnectionManager",
      `ICE connection state per ${deviceUUID}: ${state}`
    );

    // Aggiorna stato globale
    this.globalState.connectionStates[deviceUUID] = state;

    // Notifica callback UI
    if (this.globalState.onPeerConnectionStateChange) {
      this.globalState.onPeerConnectionStateChange(deviceUUID, state);
    }

    // Gestisci stati specifici
    switch (state) {
      case "connected":
      case "completed":
        logger.info(
          "PeerConnectionManager",
          `✅ Connessione a ${deviceUUID} stabilita`
        );
        this.globalState.lastKnownGoodStates[deviceUUID] = Date.now();
        this.globalState.reconnectionAttempts[deviceUUID] = 0;
        break;

      case "failed":
        logger.warning(
          "PeerConnectionManager",
          `❌ Connessione a ${deviceUUID} fallita`
        );
        this._triggerConnectionRecovery(deviceUUID);
        break;

      case "disconnected":
        logger.warning(
          "PeerConnectionManager",
          `⚠️ Connessione a ${deviceUUID} disconnessa`
        );
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            this._triggerConnectionRecovery(deviceUUID);
          }
        }, 5000);
        break;
    }
  }

  /**
   * Gestisce cambi di stato della connessione generale
   */
  _handleConnectionStateChange(pc, deviceUUID) {
    const state = pc.connectionState;
    logger.debug(
      "PeerConnectionManager",
      `Connection state per ${deviceUUID}: ${state}`
    );

    if (state === "failed") {
      this._triggerConnectionRecovery(deviceUUID);
    }
  }

  /**
   * Gestisce cambi di stato del signaling
   */
  _handleSignalingStateChange(pc, deviceUUID) {
    const state = pc.signalingState;
    logger.debug(
      "PeerConnectionManager",
      `Signaling state per ${deviceUUID}: ${state}`
    );
  }

  /**
   * Gestisce cambi di stato dell'ICE gathering
   */
  _handleIceGatheringStateChange(pc, deviceUUID) {
    const state = pc.iceGatheringState;
    logger.debug(
      "PeerConnectionManager",
      `ICE gathering state per ${deviceUUID}: ${state}`
    );
  }
  /**
   * Aggiunge tracce locali a una peer connection - VERSIONE CORRETTA PER ANSWER
   * @param {RTCPeerConnection} pc
   * @param {string} remotedeviceUUID
   * @param {boolean} isAnswer - Se true, stiamo creando un answer
   */
  _addLocalTracksIfAvailable(pc, remotedeviceUUID, isAnswer = false) {
    console.log(`🔧 _addLocalTracksIfAvailable CHIAMATO!`, {
      myId: this.globalState.getDeviceUUID(),
      hasLocalStream: !!this.globalState.getLocalStream(),
      remotedeviceUUID,
      isAnswer,
      signalingState: pc.signalingState,
      existingMappings: this.streamMappingManager?.getAllMappings(),
      existingTransceivers: pc.getTransceivers().length,
    });

    // 🔥 ADD: Guard against undefined remotedeviceUUID to prevent invalid mappings
    if (!remotedeviceUUID) {
      console.warn("⚠️ _addLocalTracksIfAvailable: remotedeviceUUID is undefined - skipping local track addition and mapping");
      this.logger?.warn(
        "PeerConnectionManager",
        "_addLocalTracksIfAvailable: remotedeviceUUID is undefined - cannot add mappings",
        {
          signalingState: pc.signalingState,
          isAnswer,
        }
      );
      return;
    }

    // Add local stream tracks (audio/video)
    const localStream = this.globalState.getLocalStream();
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        const already = pc
          .getSenders()
          .find((s) => s.track && s.track.id === track.id);
        if (!already) {
          // 🔥 STRATEGIA DIFFERENTE PER ANSWER VS OFFER
          let transceiver;

          if (isAnswer) {
            // In ANSWER mode, usa addTrack per forzare inclusione nell'SDP
            const sender = pc.addTrack(track, localStream);
            transceiver = pc.getTransceivers().find((t) => t.sender === sender);

            console.log("📝 TRACK AGGIUNTA IN ANSWER MODE:", {
              streamUUID: this.globalState.getDeviceUUID(),
              trackKind: track.kind,
              hasSender: !!sender,
              hasTransceiver: !!transceiver,
              transceiverDirection: transceiver?.direction,
            });
          } else {
            // In OFFER mode, usa addTransceiver
            transceiver = pc.addTransceiver(track, {
              direction: "sendrecv",
              streams: [localStream],
            });

            console.log("📝 TRANSCEIVER CREATO IN OFFER MODE:", {
              streamUUID: this.globalState.getDeviceUUID(),
              trackKind: track.kind,
              direction: transceiver.direction,
            });
          }

          if (transceiver) {
            const streamUUID = this.globalState.getDeviceUUID();

            // Salva per registrazione dopo SDP
            if (!pc._pendingMappings) {
              pc._pendingMappings = [];
            }
            pc._pendingMappings.push({
              transceiver,
              remotedeviceUUID,
              streamUUID,
            });

            logger.debug(
              "PeerConnectionManager",
              `${isAnswer ? "Track" : "Transceiver"} locale creato (pending mapping)`,
              {
                streamUUID,
                trackKind: track.kind,
                direction: transceiver.direction,
                mode: isAnswer ? "ANSWER" : "OFFER",
              }
            );
          }
        }
      });
    }

    // Screen share logic remains the same...
    const allScreenStreams = this.globalState.getAllScreenStreams();
    Object.entries(allScreenStreams).forEach(([streamUUID, screenStream]) => {
      if (screenStream && screenStream.getTracks) {
        screenStream.getTracks().forEach((track) => {
          const already = pc
            .getSenders()
            .find((s) => s.track && s.track.id === track.id);
          if (!already) {
            let transceiver;

            if (isAnswer) {
              const sender = pc.addTrack(track, screenStream);
              transceiver = pc
                .getTransceivers()
                .find((t) => t.sender === sender);
            } else {
              transceiver = pc.addTransceiver(track, {
                direction: "sendrecv",
                streams: [screenStream],
              });
            }

            if (transceiver && !pc._pendingMappings) {
              pc._pendingMappings = [];
            }
            if (transceiver) {
              pc._pendingMappings.push({
                transceiver,
                remotedeviceUUID,
                streamUUID,
              });
            }
          }
        });
      }
    });

    console.log("✅ TRACCE LOCALI AGGIUNTE:", {
      pendingMappings: pc._pendingMappings?.length || 0,
      totalTransceivers: pc.getTransceivers().length,
      mode: isAnswer ? "ANSWER" : "OFFER",
    });
  }

  /**
   * Processa i mapping pending dopo che l'offer è stato creato
   * @param {RTCPeerConnection} pc
   */
  processPendingMappingsAfterOffer(pc) {
    if (!pc._pendingMappings || pc._pendingMappings.length === 0) {
      console.log("📝 Nessun mapping pending da processare");
      return;
    }

    console.log("📝 PROCESSANDO MAPPING DOPO OFFER:", {
      count: pc._pendingMappings.length,
      signalingState: pc.signalingState,
      localDescription: !!pc.localDescription,
    });

    pc._pendingMappings.forEach(
      ({ transceiver, remotedeviceUUID, streamUUID }) => {
        if (transceiver.mid) {
          console.log("✅ MID DISPONIBILE DOPO OFFER:", {
            mid: transceiver.mid,
            streamUUID,
            remotedeviceUUID,
          });

          // Registra il mapping e invia via signaling
          if (this.streamMappingManager) {
            this.streamMappingManager.addLocalStreamMapping(
              remotedeviceUUID,
              streamUUID,
              transceiver.mid
            );
          }
        } else {
          console.log("❌ MID ANCORA NULL DOPO OFFER:", {
            streamUUID,
            direction: transceiver.direction,
            currentDirection: transceiver.currentDirection,
          });
        }
      }
    );

    // Pulisci pending mappings
    pc._pendingMappings = [];
  }

  /**
   * Aspetta che il MID sia disponibile e poi registra il mapping
   */
  _waitForMidAndRegisterMapping(
    remotedeviceUUID,
    streamUUID,
    transceiver,
    attemptCount = 0
  ) {
    const maxAttempts = 100; // Riduci a 5 secondi

    if (attemptCount >= maxAttempts) {
      // 🔥 DEBUG COMPLETO DEL PROBLEMA
      const pc = this.globalState.getPeerConnection(remotedeviceUUID);

      console.log("❌ DEBUG MID TIMEOUT:", {
        remotedeviceUUID,
        streamUUID,
        attemptCount,
        transceiver: {
          mid: transceiver.mid,
          direction: transceiver.direction,
          currentDirection: transceiver.currentDirection,
        },
        peerConnection: pc
          ? {
              signalingState: pc.signalingState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              connectionState: pc.connectionState,
              localDescription: !!pc.localDescription,
              remoteDescription: !!pc.remoteDescription,
              transceivers: pc.getTransceivers().map((t) => ({
                mid: t.mid,
                direction: t.direction,
                currentDirection: t.currentDirection,
              })),
            }
          : "NO_PC",
      });

      logger.error(
        "PeerConnectionManager",
        "❌ MID non disponibile dopo 5 secondi",
        {
          remotedeviceUUID,
          streamUUID,
          signalingState: pc?.signalingState,
          localDescription: !!pc?.localDescription,
          remoteDescription: !!pc?.remoteDescription,
          allTransceivers: pc?.getTransceivers().length || 0,
        }
      );
      return;
    }

    if (transceiver.mid) {
      // MID disponibile! Registra il mapping
      console.log("✅ MID DISPONIBILE, REGISTRO MAPPING:", {
        mid: transceiver.mid,
        streamUUID,
        remotedeviceUUID,
        attemptCount,
      });

      if (this.streamMappingManager) {
        this.streamMappingManager.addLocalStreamMapping(
          remotedeviceUUID,
          streamUUID,
          transceiver.mid
        );
      }
    } else {
      // 🔥 DEBUG OGNI 20 TENTATIVI (1 secondo)
      if (attemptCount % 20 === 0) {
        const pc = this.globalState.getPeerConnection(remotedeviceUUID);
        console.log("⏳ ATTENDO MID, DEBUG STATE:", {
          attemptCount,
          remotedeviceUUID,
          streamUUID,
          transceiver: {
            mid: transceiver.mid,
            direction: transceiver.direction,
          },
          pc: pc
            ? {
                signalingState: pc.signalingState,
                iceConnectionState: pc.iceConnectionState,
                localDesc: !!pc.localDescription,
                remoteDesc: !!pc.remoteDescription,
              }
            : "NO_PC",
        });
      }

      // MID non ancora disponibile, riprova
      setTimeout(() => {
        this._waitForMidAndRegisterMapping(
          remotedeviceUUID,
          streamUUID,
          transceiver,
          attemptCount + 1
        );
      }, 50);
    }
  }

  /**
   * Trigger per recovery della connessione
   */ _triggerConnectionRecovery(deviceUUID) {
    // Importa RecoveryManager qui per evitare circular imports
    import("../features/RecoveryManager.js").then(({ RecoveryManager }) => {
      const recoveryManager = new RecoveryManager(
        this.globalState,
        this.logger
      );
      recoveryManager.attemptConnectionRecovery(deviceUUID);
    });
  }

  /**
   * Ottieni info sulla connessione di un partecipante
   */
  getConnectionInfo(deviceUUID) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
    return getPeerConnectionInfo(pc, deviceUUID);
  }

  /**
   * Chiude una peer connection specifica
   * @param {string} deviceUUID
   */
  closePeerConnection(deviceUUID) {
    // Add validation for deviceUUID
    if (!deviceUUID) {
      logger.warning(
        "PeerConnectionManager",
        "Cannot close peer connection: deviceUUID is null or undefined"
      );
      return;
    }
    const pc = this.globalState.getPeerConnection(deviceUUID);
    if (pc) {
      logger.info(
        "PeerConnectionManager",
        `Chiusura connessione con ${deviceUUID}`
      );

      try {
        pc.close();
      } catch (error) {
        logger.error(
          "PeerConnectionManager",
          `Errore chiusura peer connection per ${deviceUUID}:`,
          error
        );
      }

      // Pulisci stream remoti
      const remoteStreams =
        this.globalState.getAllUserActiveStreams(deviceUUID);

      if (!remoteStreams) {
        logger.warning(
          "PeerConnectionManager",
          `Nessun stream remoto trovato per ${deviceUUID}`
        );
        return;
      }

      Object.entries(remoteStreams).forEach(([streamUUID, remoteStream]) => {
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
          this.globalState.removeActiveStream(deviceUUID, streamUUID);
          logger.debug(
            "PeerConnectionManager",
            `Removed stream ${streamUUID} for ${deviceUUID}`
          );
        }
      });

      // Pulisci dal global state
      this.globalState.removePeerConnection(deviceUUID);
      this.globalState.clearConnectionTracking(deviceUUID);

      // Notifica UI
      if (this.globalState.onParticipantLeft) {
        this.globalState.onParticipantLeft(deviceUUID);
      }

      logger.info(
        "PeerConnectionManager",
        `Connessione con ${deviceUUID} chiusa`
      );
    }
  }

  /**
   * Sends ICE candidate with retry mechanism
   * @param {RTCIceCandidate} candidate - ICE candidate to send
   * @param {string} deviceUUID - Target participant ID
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<boolean>} True if sent successfully
   * @private
   */
  async _sendICECandidateWithRetry(candidate, deviceUUID, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const SocketIO = await import("../../backend-services/socket-io.js");

        // Check if WebSocket is connected
        if (!SocketIO.default.isOpen()) {
          logger.warn(
            "PeerConnectionManager",
            `WebSocket not connected for ICE candidate to ${deviceUUID}, attempt ${attempt}/${maxRetries}`
          );

          // Wait for a short time before retrying
          if (attempt < maxRetries) {
            await this._wait(Math.min(500 * attempt, 2000)); // Shorter backoff for ICE candidates
            continue;
          } else {
            return false;
          }
        }

        // Try to send the ICE candidate
        await SocketIO.default.IceCandidate({
          candidate: candidate.toJSON(),
          to: deviceUUID,
          from: this.globalState.myId,
        });

        logger.debug(
          "PeerConnectionManager",
          `ICE candidate sent successfully to ${deviceUUID} on attempt ${attempt}`
        );

        return true;
      } catch (error) {
        logger.warn(
          "PeerConnectionManager",
          `ICE candidate send failed to ${deviceUUID} on attempt ${attempt}/${maxRetries}: ${error.message}`
        );

        if (attempt < maxRetries) {
          // Wait before retrying
          const backoffTime = Math.min(500 * attempt, 2000);
          await this._wait(backoffTime);
        }
      }
    }

    logger.error(
      "PeerConnectionManager",
      `ICE candidate send failed to ${deviceUUID} after ${maxRetries} attempts`
    );

    return false;
  }

  /**
   * Wait utility function
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   * @private
   */
  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Chiude tutte le peer connections
   */
  closeAllPeerConnections() {
    logger.info(
      "PeerConnectionManager",
      "Chiusura di tutte le connessioni peer"
    );
    const deviceUUIDs = Object.keys(this.globalState.getAllPeerConnections());
    deviceUUIDs.forEach((deviceUUID) => {
      this.closePeerConnection(deviceUUID);
    });

    logger.info("PeerConnectionManager", "Tutte le connessioni peer chiuse");
  }

  /**
   * Ottieni un report di tutte le connessioni
   */
  getConnectionsReport() {
    const connections = this.globalState.getAllPeerConnections();
    const report = {
      totalConnections: Object.keys(connections).length,
      connections: {},
    };

    Object.keys(connections).forEach((deviceUUID) => {
      report.connections[deviceUUID] = this.getConnectionInfo(deviceUUID);
    });

    return report;
  }

  /**
   * Helper per ottenere deviceUUID da track/streams
   */
  _getCurrentParticipantFromTrack(track, streams) {
    // Questa è una implementazione semplificata
    // In una implementazione reale potresti aver bisogno di più logica
    // per determinare il deviceUUID dalla traccia

    // Per ora, cerca negli userData per corrispondenze di stream
    for (const [deviceUUID, userData] of Object.entries(
      this.globalState.userData
    )) {
      if (streams.length > 0) {
        // Potresti aver bisogno di logica più sofisticata qui
        return deviceUUID;
      }
    }

    return "unknown";
  }
}

// Export the class instead of singleton
export default PeerConnectionManager;
