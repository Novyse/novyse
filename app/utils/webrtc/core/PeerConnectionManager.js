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
    const participantId = participant.from;

    if (this.globalState.getPeerConnection(participantId)) {
      logger.warning(
        "PeerConnectionManager",
        `Connessione peer per ${participantId} esiste già`
      );
      return this.globalState.getPeerConnection(participantId);
    }

    logger.info(
      "PeerConnectionManager",
      `Creazione PeerConnection per ${participantId}`
    );

    try {
      const pc = new RTCPeerConnection(this.configuration);
      const userData = {
        handle: participant.handle,
        from: participantId,
        is_speaking: false,
      };

      // Salva nel global state
      this.globalState.addPeerConnection(participantId, pc, userData);
      this.globalState.initializeConnectionTracking(participantId);

      // Configura event handlers
      this._setupPeerConnectionEventHandlers(pc, participantId);

      logger.info(
        "PeerConnectionManager",
        `PeerConnection per ${participantId} creata con successo`
      );
      return pc;
    } catch (error) {
      logger.error(
        "PeerConnectionManager",
        `Errore creazione PeerConnection per ${participantId}:`,
        error
      );
      this.globalState.removePeerConnection(participantId);
      return null;
    }
  }

  /**
   * Configura gli event handlers per una peer connection
   * @param {RTCPeerConnection} pc
   * @param {string} participantId
   */ _setupPeerConnectionEventHandlers(pc, participantId) {
    // Use ICEManager for ICE-related events if available
    if (this.iceManager) {
      this.iceManager.setupICEEventHandlers(pc, participantId);
    } else {
      // Fallback to direct ICE candidate handling
      pc.onicecandidate = async (event) => {
        await this._handleIceCandidate(event, participantId);
      };

      pc.oniceconnectionstatechange = () => {
        this._handleIceConnectionStateChange(pc, participantId);
      };

      pc.onicegatheringstatechange = () => {
        this._handleIceGatheringStateChange(pc, participantId);
      };
    }

    pc.onnegotiationneeded = async (event) => {
      console.log("🔄 NEGOTIATION NEEDED!", {
        participantId,
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
        `🔄 Negotiation needed for ${participantId}`,
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
          participantId,
          signalingState: pc.signalingState,
        });
        return;
      }

      // Se siamo in stato stabile e non stiamo già negoziando
      if (pc.signalingState === "stable") {
        try {
          console.log("🚀 CREATING RENEGOTIATION OFFER DIRECTLY:", {
            participantId,
          });

          // 🔥 MARCA CHE STIAMO RINEGOZIANDO
          pc._isRenegotiating = true;

          await this._performDirectRenegotiation(pc, participantId);
        } catch (error) {
          logger.error(
            "PeerConnectionManager",
            `Error during renegotiation for ${participantId}:`,
            error
          );
          console.error("❌ RENEGOTIATION ERROR:", { participantId, error });
        } finally {
          // 🔥 RESET FLAG ANCHE IN CASO DI ERRORE
          pc._isRenegotiating = false;
        }
      } else {
        console.log("⏳ SKIPPING RENEGOTIATION - not in stable state:", {
          participantId,
          signalingState: pc.signalingState,
        });
      }
    };

    // Track handler per stream remoti
    pc.ontrack = (event) => {
      this._handleRemoteTrack(event, participantId);
    };

    // Connection state handlers (non-ICE)
    pc.onconnectionstatechange = () => {
      this._handleConnectionStateChange(pc, participantId);
    };

    pc.onsignalingstatechange = () => {
      this._handleSignalingStateChange(pc, participantId);
    };

    logger.debug(
      "PeerConnectionManager",
      `Event handlers configurati per ${participantId}`
    );
  }
  /**
   * Gestisce ICE candidates
   */
  async _handleIceCandidate(event, participantId) {
    if (event.candidate) {
      logger.debug(
        "PeerConnectionManager",
        `ICE candidate generato per ${participantId}:`,
        {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
        }
      );

      // Retry mechanism for ICE candidate sending
      const success = await this._sendICECandidateWithRetry(
        event.candidate,
        participantId,
        3
      );

      if (!success) {
        logger.warn(
          "PeerConnectionManager",
          `Failed to send ICE candidate to ${participantId} after retries`
        );
      }
    } else {
      logger.debug(
        "PeerConnectionManager",
        `ICE gathering completato per ${participantId}`
      );
    }
  }

  /**
   * Esegue rinegoziazione direttamente senza SignalingManager
   */
  async _performDirectRenegotiation(pc, participantId) {
    try {
      console.log("📝 STARTING DIRECT RENEGOTIATION:", {
        participantId,
        currentSignalingState: pc.signalingState,
        currentTransceivers: pc.getTransceivers().length,
        currentSenders: pc.getSenders().length,
      });

      // 1. Aggiungi tutte le tracce locali che non sono ancora state aggiunte
      this._addLocalTracksIfAvailable(pc, participantId, false);

      // 2. Crea nuova offer
      console.log("🎯 CREATING NEW OFFER FOR RENEGOTIATION...");
      const offer = await pc.createOffer();

      console.log("✅ OFFER CREATED:", {
        participantId,
        hasOffer: !!offer,
        offerType: offer?.type,
        sdpLength: offer?.sdp?.length || 0,
      });

      // 3. Imposta local description
      await pc.setLocalDescription(offer);

      console.log("✅ LOCAL DESCRIPTION SET:", {
        participantId,
        newSignalingState: pc.signalingState,
        hasLocalDescription: !!pc.localDescription,
      });

      // 4. Processa mapping dopo aver impostato la local description
      this.processPendingMappingsAfterOffer(pc);

      // 5. Invia offer via WebSocket
      console.log("📡 SENDING RENEGOTIATION OFFER VIA WEBSOCKET...");

      const webSocketMethods = await import("../../webSocketMethods.js");
      await webSocketMethods.default.RTCOffer({
        offer: offer,
        to: participantId,
        from: this.globalState.getMyId(),
      });

      console.log("🎉 RENEGOTIATION OFFER SENT SUCCESSFULLY:", {
        participantId,
        from: this.globalState.getMyId(),
      });

      logger.info(
        "PeerConnectionManager",
        `✅ Renegotiation offer sent for ${participantId}`,
        {
          signalingState: pc.signalingState,
          transceivers: pc.getTransceivers().length,
          senders: pc.getSenders().length,
        }
      );
    } catch (error) {
      console.error("❌ DIRECT RENEGOTIATION FAILED:", {
        participantId,
        error: error.message,
        stack: error.stack,
      });

      logger.error(
        "PeerConnectionManager",
        `❌ Direct renegotiation failed for ${participantId}:`,
        error
      );

      throw error;
    }
  }

  // Add method to register a mid mapping
  registerScreenShareMid(participantId, mid, screenShareUUID) {
    const key = `${participantId}_${mid}`;
    this.midToScreenShareMap.set(key, screenShareUUID);
    logger.debug(
      "PeerConnectionManager",
      `Registered screen share mapping: ${key} → ${screenShareUUID}`
    );
  }
  /**
   * Gestisce tracce remote ricevute - VERSIONE CON MAPPING MANAGER
   */
  _handleRemoteTrack(event, participantId) {

    if (!participantId) {
      logger.error("PeerConnectionManager", "❌ ParticipantId mancante");
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
      `🎯 Traccia ricevuta da ${participantId}`,
      {
        trackKind: event.track.kind,
        trackId: event.track.id,
        transceiverMid: event.transceiver.mid,
      }
    );

    // 🔥 CERCA IL MAPPING NEL StreamMappingManager
    const streamUUID = this.streamMappingManager?.getStreamUUIDByMid(
      participantId,
      event.transceiver.mid
    );

    if (streamUUID) {
      // 3.1 - MAPPING TROVATO: Processa subito la traccia
      console.log("✅ MAPPING TROVATO SUBITO!", {
        participantId,
        mid: event.transceiver.mid,
        streamUUID,
        trackKind: event.track.kind,
      });

      logger.info(
        "PeerConnectionManager",
        `✅ Mapping trovato per MID ${event.transceiver.mid}`,
        {
          participantId,
          streamUUID,
          trackKind: event.track.kind,
        }
      );

      // Processa la traccia con lo streamUUID trovato
      this._processTrackWithStreamUUID(event, participantId, streamUUID);
    } else {
      // 3.2 - MAPPING NON TROVATO: Aspetta e riprova
      console.log("⏳ MAPPING NON TROVATO, ASPETTO...", {
        participantId,
        mid: event.transceiver.mid,
        trackKind: event.track.kind,
        availableMappings: this.streamMappingManager?.getAllMappings(),
      });

      logger.warning(
        "PeerConnectionManager",
        `⏳ Mapping non trovato per MID ${event.transceiver.mid}, aspetto signaling...`,
        {
          participantId,
          transceiverMid: event.transceiver.mid,
          trackKind: event.track.kind,
        }
      );

      // Aspetta che il mapping arrivi via signaling WebSocket
      this._waitForMappingFromSignaling(event, participantId, 0);
    }
  }

  /**
   * Aspetta che il mapping arrivi via signaling WebSocket
   */
  _waitForMappingFromSignaling(event, participantId, attemptCount) {
    const maxAttempts = 200; // 10 secondi (200 x 50ms) - più tempo per il signaling

    if (attemptCount >= maxAttempts) {
      logger.error(
        "PeerConnectionManager",
        `❌ Mapping non arrivato dopo ${maxAttempts * 50}ms via signaling`,
        {
          participantId,
          transceiverMid: event.transceiver.mid,
          trackKind: event.track.kind,
          finalMappings: this.streamMappingManager?.getAllMappings(),
        }
      );

      console.log("❌ TIMEOUT MAPPING!", {
        participantId,
        mid: event.transceiver.mid,
        waitedMs: maxAttempts * 50,
        finalMappings: this.streamMappingManager?.getAllMappings(),
      });
      return;
    }

    setTimeout(() => {
      // Ricontrolla se il mapping è arrivato via WebSocket
      const streamUUID = this.streamMappingManager?.getStreamUUIDByMid(
        participantId,
        event.transceiver.mid
      );

      if (streamUUID) {
        // MAPPING FINALMENTE ARRIVATO!
        console.log("🎉 MAPPING ARRIVATO DOPO ATTESA!", {
          participantId,
          mid: event.transceiver.mid,
          streamUUID,
          waitedMs: attemptCount * 50,
          attempts: attemptCount + 1,
        });

        logger.info(
          "PeerConnectionManager",
          `✅ Mapping ricevuto via signaling dopo ${attemptCount * 50}ms`,
          {
            participantId,
            streamUUID,
            transceiverMid: event.transceiver.mid,
            attempts: attemptCount + 1,
          }
        );

        // Processa la traccia con il mapping ricevuto
        this._processTrackWithStreamUUID(event, participantId, streamUUID);
      } else {
        // Continua ad aspettare
        if (attemptCount % 20 === 0) {
          // Log ogni secondo
          console.log("⏳ ANCORA IN ATTESA MAPPING...", {
            participantId,
            mid: event.transceiver.mid,
            attemptCount: attemptCount + 1,
            waitedMs: (attemptCount + 1) * 50,
          });
        }

        this._waitForMappingFromSignaling(
          event,
          participantId,
          attemptCount + 1
        );
      }
    }, 50);
  }

  /**
   * Processa la traccia con lo streamUUID
   */
  _processTrackWithStreamUUID(event, participantId, streamUUID) {
    logger.info(
      "PeerConnectionManager",
      `🔄 Processing track con streamUUID ${streamUUID}`,
      {
        participantId,
        streamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Controlla se esiste già uno stream con questo UID
    let existingStream = this.globalState.getActiveStream(
      participantId,
      streamUUID
    );

    if (existingStream) {
      logger.info(
        "PeerConnectionManager",
        `🔗 Aggiunta traccia a stream esistente`,
        {
          participantId,
          streamUUID,
          trackKind: event.track.kind,
          existingTracks: existingStream.getTracks().length,
        }
      );

      // Verifica che la traccia non sia già presente
      const trackExists = existingStream
        .getTracks()
        .find((t) => t.id === event.track.id);
      if (!trackExists) {
        existingStream.addTrack(event.track);
      }
    } else {
      logger.info(
        "PeerConnectionManager",
        `✨ Creazione nuovo stream per streamUUID ${streamUUID}`,
        {
          participantId,
          streamUUID,
          trackKind: event.track.kind,
        }
      );

      // Crea nuovo stream
      const newStream = createMediaStream();
      newStream.addTrack(event.track);
      this.globalState.addActiveStream(participantId, streamUUID, newStream);
      existingStream = newStream;
    }

    // 🔥 FIX: Determina il tipo di stream basandosi sul streamUUID
    const isScreenShare = streamUUID !== participantId;

    if (isScreenShare) {
      // È uno screen share - aggiorna anche userData per includerlo
      this.globalState.addScreenShare(
        participantId,
        streamUUID,
        existingStream
      );
      logger.info(
        "PeerConnectionManager",
        `🖥️ Screen share stream aggiornato`,
        {
          participantId,
          streamUUID,
          trackKind: event.track.kind,
          totalTracks: existingStream.getTracks().length,
        }
      );
    } else {
      // È stream principale (audio/video webcam)
      // Se è audio, aggiungilo all'AudioContext
      if (event.track.kind === "audio") {
        if (this.globalState.audioContextRef && Platform.OS === "web") {
          const audioElement = document.getElementById(
            `audio-${participantId}`
          );
          if (!audioElement) {
            logger.info(
              "PeerConnectionManager",
              `🔊 Aggiunta NUOVO audio all'AudioContext`,
              {
                participantId,
                streamUUID,
              }
            );
            this.globalState.audioContextRef.addAudio(
              participantId,
              existingStream
            );
          } else {
            logger.info(
              "PeerConnectionManager",
              `🔊 Aggiornamento audio esistente nell'AudioContext`,
              {
                participantId,
                streamUUID,
                elementExists: true,
              }
            );

            // 🔥 AGGIORNA SOLO LO STREAM SENZA RICREARE L'ELEMENTO
            audioElement.srcObject = existingStream;
            audioElement.volume = 1.0; // 🔥 ASSICURATI CHE IL VOLUME SIA MASSIMO
            audioElement.muted = false; // 🔥 ASSICURATI CHE NON SIA MUTATO

            // 🔥 FORZA LA RIPRODUZIONE
            audioElement.play().catch((error) => {
              logger.warning(
                "PeerConnectionManager",
                `⚠️ Autoplay audio fallito per ${participantId}: ${error.message}`
              );
            });
          }
        } else {
          logger.error(
            "PeerConnectionManager",
            `❌ AudioContext NON DISPONIBILE per ${participantId}`,
            {
              audioContextRef: !!this.globalState.audioContextRef,
            }
          );
        }
      }
    }

    // Setup event handlers per la traccia
    this._setupTrackEventHandlers(
      event.track,
      participantId,
      isScreenShare ? "screenshare" : "webcam",
      streamUUID
    );

    EventEmitter.sendLocalUpdateNeeded(
      participantId,
      streamUUID,
      existingStream
    );

    // 🔥 FINAL DEBUG: Verifica stato finale
    const finalVerifyStream = this.globalState.getActiveStream(
      participantId,
      streamUUID
    );
    console.log("🔍 FINAL VERIFICATION:", {
      participantId,
      streamUUID,
      isScreenShare,
      finalStreamExists: !!finalVerifyStream,
      finalTracks: finalVerifyStream ? finalVerifyStream.getTracks().length : 0,
      finalTrackTypes: finalVerifyStream
        ? finalVerifyStream.getTracks().map((t) => t.kind)
        : [],
    });

    logger.info("PeerConnectionManager", `✅ Traccia elaborata con successo`, {
      participantId,
      streamUUID,
      trackKind: event.track.kind,
      streamType: isScreenShare ? "screenshare" : "webcam",
      totalTracks: existingStream.getTracks().length,
      audioTracks: existingStream.getAudioTracks().length,
      videoTracks: existingStream.getVideoTracks().length,
    });
  }
  /**
   * Gestisce tracce webcam/audio (stesso stream)
   */
  _handleWebcamTrack(event, participantId, streamUUID = null) {
    const finalStreamUUID = participantId;

    logger.info(
      "PeerConnectionManager",
      `🎥 Gestione traccia webcam/audio per ${participantId}`,
      {
        streamUUID: finalStreamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Ottieni o crea lo stream principale per questo partecipante
    let mainStream = this.globalState.getActiveStream(
      participantId,
      finalStreamUUID
    );

    if (!mainStream) {
      mainStream = createMediaStream();
      this.globalState.addActiveStream(
        participantId,
        finalStreamUUID,
        mainStream
      );
      logger.info(
        "PeerConnectionManager",
        `✨ Nuovo stream principale creato per ${participantId}`,
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
        participantId,
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
          `🔊 Aggiunta audio all'AudioContext per ${participantId}`
        );
        this.globalState.audioContextRef.addAudio(participantId, mainStream);
      } else {
        logger.warning(
          "PeerConnectionManager",
          `⚠️ AudioContext non disponibile per ${participantId}`,
          {
            audioContextRef: !!this.globalState.audioContextRef,
          }
        );
      }
    }

    // Setup event handlers per la traccia
    this._setupTrackEventHandlers(
      event.track,
      participantId,
      "webcam",
      finalStreamUUID
    );

    // Notifica che lo stream è stato aggiornato
    EventEmitter.sendLocalUpdateNeeded(
      participantId,
      finalStreamUUID,
      mainStream
    );
  }

  /**
   * Gestisce tracce screen share (stream separati)
   */
  _handleScreenShareTrack(event, participantId, streamUUID) {
    logger.info(
      "PeerConnectionManager",
      `🖥️ Gestione traccia screen share per ${participantId}`,
      {
        streamUUID,
        trackKind: event.track.kind,
        trackId: event.track.id,
      }
    );

    // Ottieni o crea lo stream screen share
    let screenStream = this.globalState.getActiveStream(
      participantId,
      streamUUID
    );

    if (!screenStream) {
      screenStream = createMediaStream();
      this.globalState.addActiveStream(participantId, streamUUID, screenStream);
      logger.info(
        "PeerConnectionManager",
        `✨ Nuovo stream screen share creato`,
        {
          participantId,
          streamUUID,
        }
      );
    }

    // Aggiungi la traccia allo stream screen share
    screenStream.addTrack(event.track);

    logger.info("PeerConnectionManager", `➕ Traccia screen share aggiunta`, {
      participantId,
      streamUUID,
      trackKind: event.track.kind,
      totalTracks: screenStream.getTracks().length,
    });

    // Aggiorna userData per includere questo screen share
    this.globalState.addScreenShare(participantId, streamUUID, screenStream);

    // Setup event handlers per la traccia
    this._setupTrackEventHandlers(
      event.track,
      participantId,
      "screenshare",
      streamUUID
    );

    EventEmitter.sendLocalUpdateNeeded(participantId, streamUUID, screenStream);
  }

  /**
   * Configura event handlers per le tracce
   */
  _setupTrackEventHandlers(
    track,
    participantId = null,
    streamType = null,
    streamId = null
  ) {
    track.onended = () => {
      logger.debug("PeerConnectionManager", "Traccia remota terminata:", {
        trackId: track.id,
        participantId,
        streamType,
        streamId,
      });

      // 🔥 RIMUOVI MAPPING QUANDO LA TRACCIA TERMINA
      if (participantId && this.streamMappingManager) {
        // Trova il MID associato a questa traccia
        const pc = this.globalState.getPeerConnection(participantId);
        if (pc) {
          const transceivers = pc.getTransceivers();
          const transceiver = transceivers.find(
            (t) =>
              t.receiver && t.receiver.track && t.receiver.track.id === track.id
          );

          if (transceiver && transceiver.mid) {
            // Rimuovi il mapping per questo MID
            this.streamMappingManager.removeMappingByMid(
              participantId,
              transceiver.mid
            );

            logger.info(
              "PeerConnectionManager",
              "🗑️ Mapping rimosso per traccia terminata",
              {
                participantId,
                trackId: track.id,
                mid: transceiver.mid,
                streamType,
                streamId,
              }
            );
          } else {
            logger.warning(
              "PeerConnectionManager",
              "⚠️ Non trovato transceiver per traccia terminata",
              {
                participantId,
                trackId: track.id,
                streamType,
                streamId,
              }
            );
          }
        }
      }

      EventEmitter.sendLocalUpdateNeeded(
        participantId,
        streamId,
        this.globalState.getActiveStream(participantId, streamId)
      );
    };

    track.onmute = () => {
      logger.debug("PeerConnectionManager", "Traccia remota mutata:", track.id);
      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
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
  _handleIceConnectionStateChange(pc, participantId) {
    const state = pc.iceConnectionState;
    logger.info(
      "PeerConnectionManager",
      `ICE connection state per ${participantId}: ${state}`
    );

    // Aggiorna stato globale
    this.globalState.connectionStates[participantId] = state;

    // Notifica callback UI
    if (this.globalState.onPeerConnectionStateChange) {
      this.globalState.onPeerConnectionStateChange(participantId, state);
    }

    // Gestisci stati specifici
    switch (state) {
      case "connected":
      case "completed":
        logger.info(
          "PeerConnectionManager",
          `✅ Connessione a ${participantId} stabilita`
        );
        this.globalState.lastKnownGoodStates[participantId] = Date.now();
        this.globalState.reconnectionAttempts[participantId] = 0;
        break;

      case "failed":
        logger.warning(
          "PeerConnectionManager",
          `❌ Connessione a ${participantId} fallita`
        );
        this._triggerConnectionRecovery(participantId);
        break;

      case "disconnected":
        logger.warning(
          "PeerConnectionManager",
          `⚠️ Connessione a ${participantId} disconnessa`
        );
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            this._triggerConnectionRecovery(participantId);
          }
        }, 5000);
        break;
    }
  }

  /**
   * Gestisce cambi di stato della connessione generale
   */
  _handleConnectionStateChange(pc, participantId) {
    const state = pc.connectionState;
    logger.debug(
      "PeerConnectionManager",
      `Connection state per ${participantId}: ${state}`
    );

    if (state === "failed") {
      this._triggerConnectionRecovery(participantId);
    }
  }

  /**
   * Gestisce cambi di stato del signaling
   */
  _handleSignalingStateChange(pc, participantId) {
    const state = pc.signalingState;
    logger.debug(
      "PeerConnectionManager",
      `Signaling state per ${participantId}: ${state}`
    );
  }

  /**
   * Gestisce cambi di stato dell'ICE gathering
   */
  _handleIceGatheringStateChange(pc, participantId) {
    const state = pc.iceGatheringState;
    logger.debug(
      "PeerConnectionManager",
      `ICE gathering state per ${participantId}: ${state}`
    );
  }
  /**
   * Aggiunge tracce locali a una peer connection - VERSIONE CORRETTA PER ANSWER
   * @param {RTCPeerConnection} pc
   * @param {string} remoteParticipantUUID
   * @param {boolean} isAnswer - Se true, stiamo creando un answer
   */
  _addLocalTracksIfAvailable(pc, remoteParticipantUUID, isAnswer = false) {
    console.log("🔧 _addLocalTracksIfAvailable CHIAMATO!", {
      myId: this.globalState.getMyId(),
      hasLocalStream: !!this.globalState.getLocalStream(),
      remoteParticipantUUID: remoteParticipantUUID,
      isAnswer,
      signalingState: pc.signalingState,
    });

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
              streamUUID: this.globalState.getMyId(),
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
              streamUUID: this.globalState.getMyId(),
              trackKind: track.kind,
              direction: transceiver.direction,
            });
          }

          if (transceiver) {
            const streamUUID = this.globalState.getMyId();

            // Salva per registrazione dopo SDP
            if (!pc._pendingMappings) {
              pc._pendingMappings = [];
            }
            pc._pendingMappings.push({
              transceiver,
              remoteParticipantUUID,
              streamUUID,
            });

            logger.debug(
              "PeerConnectionManager",
              `${
                isAnswer ? "Track" : "Transceiver"
              } locale creato (pending mapping)`,
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
                remoteParticipantUUID,
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
      ({ transceiver, remoteParticipantUUID, streamUUID }) => {
        if (transceiver.mid) {
          console.log("✅ MID DISPONIBILE DOPO OFFER:", {
            mid: transceiver.mid,
            streamUUID,
            remoteParticipantUUID,
          });

          // Registra il mapping e invia via signaling
          if (this.streamMappingManager) {
            this.streamMappingManager.addLocalStreamMapping(
              remoteParticipantUUID,
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
    remoteParticipantId,
    streamUUID,
    transceiver,
    attemptCount = 0
  ) {
    const maxAttempts = 100; // Riduci a 5 secondi

    if (attemptCount >= maxAttempts) {
      // 🔥 DEBUG COMPLETO DEL PROBLEMA
      const pc = this.globalState.getPeerConnection(remoteParticipantId);

      console.log("❌ DEBUG MID TIMEOUT:", {
        remoteParticipantId,
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
          remoteParticipantId,
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
        remoteParticipantId,
        attemptCount,
      });

      if (this.streamMappingManager) {
        this.streamMappingManager.addLocalStreamMapping(
          remoteParticipantId,
          streamUUID,
          transceiver.mid
        );
      }
    } else {
      // 🔥 DEBUG OGNI 20 TENTATIVI (1 secondo)
      if (attemptCount % 20 === 0) {
        const pc = this.globalState.getPeerConnection(remoteParticipantId);
        console.log("⏳ ATTENDO MID, DEBUG STATE:", {
          attemptCount,
          remoteParticipantId,
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
          remoteParticipantId,
          streamUUID,
          transceiver,
          attemptCount + 1
        );
      }, 50);
    }
  }

  /**
   * Trigger per recovery della connessione
   */ _triggerConnectionRecovery(participantId) {
    // Importa RecoveryManager qui per evitare circular imports
    import("../features/RecoveryManager.js").then(({ RecoveryManager }) => {
      const recoveryManager = new RecoveryManager(
        this.globalState,
        this.logger
      );
      recoveryManager.attemptConnectionRecovery(participantId);
    });
  }

  /**
   * Ottieni info sulla connessione di un partecipante
   */
  getConnectionInfo(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    return getPeerConnectionInfo(pc, participantId);
  }

  /**
   * Chiude una peer connection specifica
   * @param {string} participantId
   */
  closePeerConnection(participantId) {
    // Add validation for participantId
    if (!participantId) {
      logger.warning(
        "PeerConnectionManager",
        "Cannot close peer connection: participantId is null or undefined"
      );
      return;
    }
    const pc = this.globalState.getPeerConnection(participantId);
    if (pc) {
      logger.info(
        "PeerConnectionManager",
        `Chiusura connessione con ${participantId}`
      );

      try {
        pc.close();
      } catch (error) {
        logger.error(
          "PeerConnectionManager",
          `Errore chiusura peer connection per ${participantId}:`,
          error
        );
      }

      // Pulisci stream remoti
      const remoteStreams =
        this.globalState.getAllUserActiveStreams(participantId);

      if (!remoteStreams) {
        logger.warning(
          "PeerConnectionManager",
          `Nessun stream remoto trovato per ${participantId}`
        );
        return;
      }

      Object.entries(remoteStreams).forEach(([streamUUID, remoteStream]) => {
        if (remoteStream) {
          remoteStream.getTracks().forEach((track) => track.stop());
          this.globalState.removeActiveStream(participantId, streamUUID);
          logger.debug(
            "PeerConnectionManager",
            `Removed stream ${streamUUID} for ${participantId}`
          );
        }
      });

      // Pulisci dal global state
      this.globalState.removePeerConnection(participantId);
      this.globalState.clearConnectionTracking(participantId);

      // Notifica UI
      if (this.globalState.onParticipantLeft) {
        this.globalState.onParticipantLeft(participantId);
      }

      logger.info(
        "PeerConnectionManager",
        `Connessione con ${participantId} chiusa`
      );
    }
  }

  /**
   * Sends ICE candidate with retry mechanism
   * @param {RTCIceCandidate} candidate - ICE candidate to send
   * @param {string} participantId - Target participant ID
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<boolean>} True if sent successfully
   * @private
   */
  async _sendICECandidateWithRetry(candidate, participantId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const webSocketMethods = await import("../../webSocketMethods.js");

        // Check if WebSocket is connected
        if (!webSocketMethods.default.isWebSocketOpen()) {
          logger.warn(
            "PeerConnectionManager",
            `WebSocket not connected for ICE candidate to ${participantId}, attempt ${attempt}/${maxRetries}`
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
        await webSocketMethods.default.IceCandidate({
          candidate: candidate.toJSON(),
          to: participantId,
          from: this.globalState.myId,
        });

        logger.debug(
          "PeerConnectionManager",
          `ICE candidate sent successfully to ${participantId} on attempt ${attempt}`
        );

        return true;
      } catch (error) {
        logger.warn(
          "PeerConnectionManager",
          `ICE candidate send failed to ${participantId} on attempt ${attempt}/${maxRetries}: ${error.message}`
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
      `ICE candidate send failed to ${participantId} after ${maxRetries} attempts`
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
    const participantIds = Object.keys(
      this.globalState.getAllPeerConnections()
    );
    participantIds.forEach((participantId) => {
      this.closePeerConnection(participantId);
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

    Object.keys(connections).forEach((participantId) => {
      report.connections[participantId] = this.getConnectionInfo(participantId);
    });

    return report;
  }

  /**
   * Helper per ottenere participantId da track/streams
   */
  _getCurrentParticipantFromTrack(track, streams) {
    // Questa è una implementazione semplificata
    // In una implementazione reale potresti aver bisogno di più logica
    // per determinare il participantId dalla traccia

    // Per ora, cerca negli userData per corrispondenze di stream
    for (const [participantId, userData] of Object.entries(
      this.globalState.userData
    )) {
      if (streams.length > 0) {
        // Potresti aver bisogno di logica più sofisticata qui
        return participantId;
      }
    }

    return "unknown";
  }
}

// Export the class instead of singleton
export default PeerConnectionManager;
