import {
  RTCPeerConnection,
  createMediaStream,
} from "../utils/compatibility.js";
import { getWebRTCConfiguration } from "../config/configuration.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";
import { GlobalState } from "./GlobalState.js";
import { StreamMappingManager } from "./StreamMappingManager.js";
import logger from "../logging/WebRTCLogger.js";
import {
  getPeerConnectionInfo,
  isConnectionHealthy,
  isConnectionFailed,
} from "../utils/helpers.js";

/**
 * Gestisce la creazione, configurazione e chiusura delle peer connections
 */
class PeerConnectionManager {
  constructor(globalState, streamMappingManager = null) {
    this.configuration = getWebRTCConfiguration();
    this.globalState = globalState || new GlobalState();
    this.streamMappingManager =
      streamMappingManager ||
      new StreamMappingManager(this.globalState, logger);
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

      // Aggiungi tracce locali se disponibili
      this._addLocalTracksIfAvailable(pc);

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
   * Gestisce tracce remote ricevute
   */
  _handleRemoteTrack(event, participantId) {
    logger.info(
      "PeerConnectionManager",
      `Traccia remota ricevuta da ${participantId}:`,
      {
        kind: event.track.kind,
        label: event.track.label,
        id: event.track.id,
        streams: event.streams.map((s) => s.id),
      }
    );

    // Try to get mapping from StreamMappingManager first
    let streamUUID = null;
    let trackType = null;

    if (
      this.streamMappingManager &&
      event.transceiver &&
      event.transceiver.mid
    ) {
      const mapping = this.streamMappingManager.getStreamUUIDByMid(
        event.transceiver.mid
      );
      if (mapping) {
        streamUUID = mapping.streamUUID;
        trackType = mapping.trackType;
        logger.info(
          "PeerConnectionManager",
          `Found mapping for MID ${event.transceiver.mid}: ${streamUUID} (${trackType})`
        );
      } else {
        logger.debug(
          "PeerConnectionManager",
          `No mapping found for MID ${event.transceiver.mid}, using fallback detection`
        );
      }
    }

    // If we have mapping, use it directly
    if (streamUUID && trackType) {
      if (trackType === "screenshare") {
        // Extract streamId from streamUUID (format: participantId_StreamID)
        const streamId = streamUUID.split("_").slice(1).join("_");
        this._handleScreenShareTrack(
          event,
          participantId,
          event.track,
          streamId
        );
      } else {
        this._handleWebcamTrack(event, participantId);
      }

      // Register remote track mapping for future reference
      this.streamMappingManager.registerRemoteTrackMapping(
        participantId,
        event.track.id,
        streamUUID,
        trackType
      );
      return;
    }

    // Fallback to original heuristic method if no mapping found
    if (event.track.kind === "video") {
      const isScreenShare = this._isScreenShareTrack(
        event.track,
        participantId
      );

      if (isScreenShare) {
        logger.debug(
          "PeerConnectionManager",
          `Traccia identificata come screen share da ${participantId} (fallback)`
        );
        this._handleScreenShareTrack(event, participantId, event.track);
      } else {
        logger.debug(
          "PeerConnectionManager",
          `Traccia identificata come webcam video da ${participantId} (fallback)`
        );
        this._handleWebcamTrack(event, participantId);
      }
    } else if (event.track.kind === "audio") {
      logger.debug(
        "PeerConnectionManager",
        `Traccia audio ricevuta da ${participantId}:`,
        {
          trackId: event.track.id,
          trackLabel: event.track.label,
          streams: event.streams.map((s) => s.id),
        }
      );
      this._handleWebcamTrack(event, participantId);
    } else {
      logger.warn(
        "PeerConnectionManager",
        `Ricevuta traccia remota di tipo sconosciuto: ${event.track.kind} da ${participantId}`
      );
    }
  }

  /**
   * Verifica se una traccia è di screen sharing
   */
  _isScreenShareTrack(track, participantId) {
    const screenShareUUID = participantId + "_" + track.id;
    const isScreenShare = this.globalState.isScreenShare(
      participantId,
      screenShareUUID
    );
    logger.debug(
      "PeerConnectionManager",
      `Verifica screen share per ${participantId}/${track.id} - IsScreenShare: ${isScreenShare}`
    );
    console.log(
      "PeerConnectionManager",
      `Verifica screen share per ${participantId}/${track.id} - IsScreenShare: ${isScreenShare}`
    );
    return isScreenShare;
  }
  /**
   * Gestisce tracce di screen sharing
   */
  _handleScreenShareTrack(event, participantId, track, streamId = null) {
    // If streamId not provided, generate it from track.id (fallback)
    const screenShareUUID = streamId
      ? `${participantId}_${streamId}`
      : `${participantId}_${track.id}`;

    if (!this.globalState.remoteScreenStreams[participantId]) {
      this.globalState.remoteScreenStreams[participantId] = {};
    }
    if (!this.globalState.remoteScreenStreams[participantId][screenShareUUID]) {
      this.globalState.remoteScreenStreams[participantId][screenShareUUID] =
        createMediaStream();
    }
    this.globalState.remoteScreenStreams[participantId][
      screenShareUUID
    ].addTrack(event.track);
    logger.info(
      "PeerConnectionManager",
      `Screen share track aggiunta: ${participantId}/${screenShareUUID}`
    );

    // IMPORTANT: Also update userData to include this screen share in active_screen_share array
    this.globalState.addScreenShare(
      participantId,
      screenShareUUID,
      this.globalState.remoteScreenStreams[participantId][screenShareUUID]
    );

    logger.info(
      "PeerConnectionManager",
      `Added screen share ${screenShareUUID} to userData for participant ${participantId}`
    );

    // Setup track event handlers with screen share info
    this._setupTrackEventHandlers(
      event.track,
      participantId,
      "screenshare",
      screenShareUUID
    );

    // Emetti evento per UI
    this._emitStreamEvent(
      participantId,
      this.globalState.remoteScreenStreams[participantId][screenShareUUID],
      "screenshare",
      screenShareUUID
    );
  }

  /**
   * Gestisce tracce webcam
   */ _handleWebcamTrack(event, participantId) {
    if (!this.globalState.remoteStreams[participantId]) {
      this.globalState.addRemoteStream(participantId, createMediaStream());
    }

    const stream = this.globalState.remoteStreams[participantId];
    stream.addTrack(event.track); // Gestisci audio tramite AudioContext se disponibile
    logger.debug(
      "PeerConnectionManager",
      `Checking audio context for ${participantId}:`,
      {
        audioContextRef: !!this.globalState.audioContextRef,
        audioTracks: stream.getAudioTracks().length,
        trackKind: event.track.kind,
      }
    );

    if (
      this.globalState.audioContextRef &&
      stream.getAudioTracks().length > 0
    ) {
      logger.info(
        "PeerConnectionManager",
        `Calling addAudio for ${participantId}`
      );
      this.globalState.audioContextRef.addAudio(participantId, stream);
    } else {
      logger.warning(
        "PeerConnectionManager",
        `Audio not added for ${participantId}:`,
        {
          audioContextRef: !!this.globalState.audioContextRef,
          audioTracks: stream.getAudioTracks().length,
          reason: !this.globalState.audioContextRef
            ? "No audioContextRef"
            : "No audio tracks",
        }
      );
    }

    logger.info(
      "PeerConnectionManager",
      `Webcam track aggiunta per ${participantId}`
    ); // Emetti evento per UI
    this._emitStreamEvent(participantId, stream, "webcam");

    // Setup track event handlers
    this._setupTrackEventHandlers(event.track, participantId, "webcam");
  }

  /**
   * Emette eventi per aggiornamenti stream
   */
  _emitStreamEvent(participantId, stream, streamType, streamId = null) {
    // Importa eventEmitter qui per evitare circular imports
    import("../../EventEmitter.js").then(({ default: eventEmitter }) => {
      eventEmitter.emit("stream_added_or_updated", {
        participantId,
        stream,
        streamType,
        streamId,
        userData: this.globalState.userData[participantId],
      });
    });

    // Notifica UI update
    if (this.globalState.onStreamUpdate) {
      this.globalState.onStreamUpdate();
    }
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

      // If it's a screen share track that ended, remove it from userData
      if (streamType === "screenshare" && participantId && streamId) {
        this.globalState.removeScreenShare(participantId, streamId);
        logger.info(
          "PeerConnectionManager",
          `Removed ended screen share ${streamId} from userData for participant ${participantId}`
        );
      }

      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
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
      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
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
   * Aggiunge tracce locali a una peer connection
   * @param {RTCPeerConnection} pc
   */
  _addLocalTracksIfAvailable(pc) {
    // Add local stream tracks (audio/video)
    if (this.globalState.localStream) {
      this.globalState.localStream.getTracks().forEach((track) => {
        // Evita duplicati
        const already = pc
          .getSenders()
          .find((s) => s.track && s.track.id === track.id);
        if (!already) {
          // Use addTransceiver instead of addTrack to get MID access
          const transceiver = pc.addTransceiver(track, {
            direction: "sendrecv",
            streams: [this.globalState.localStream],
          });

          // Register mapping with StreamMappingManager for webcam tracks
          const registerMapping = () => {
            if (this.streamMappingManager && transceiver.mid) {
              const streamUUID = this.streamMappingManager.generateStreamUUID(
                this.globalState.myId,
                "webcam" // normal tracks use participantId
              );

              this.streamMappingManager.registerLocalTransceiverMapping(
                transceiver,
                streamUUID,
                "webcam",
                this.globalState.myId
              );

              logger.debug(
                "PeerConnectionManager",
                `Webcam mapping registered: MID ${transceiver.mid} -> ${streamUUID}`
              );
              return true;
            }
            return false;
          };

          // Try to register immediately, if it fails, set up a delayed retry
          if (!registerMapping()) {
            // MID not available yet, set up a check in the next event loop cycles
            let retryCount = 0;
            const maxRetries = 10;
            const retryInterval = setInterval(() => {
              if (registerMapping() || retryCount >= maxRetries) {
                clearInterval(retryInterval);
                if (retryCount >= maxRetries) {
                  logger.warning(
                    "PeerConnectionManager",
                    `Failed to register webcam mapping after ${maxRetries} retries`
                  );
                }
              }
              retryCount++;
            }, 50); // Check every 50ms
          }

          logger.debug(
            "PeerConnectionManager",
            `Traccia locale aggiunta: ${track.kind}, MID: ${
              transceiver.mid || "pending"
            }`
          );
        }
      });
    } else {
      logger.debug(
        "PeerConnectionManager",
        "Nessun local stream disponibile per aggiungere tracce"
      );
    }

    // Add screen share tracks
    const allScreenStreams = this.globalState.getAllScreenStreams();
    Object.entries(allScreenStreams).forEach(([streamId, screenStream]) => {
      if (screenStream && screenStream.getTracks) {
        screenStream.getTracks().forEach((track) => {
          // Evita duplicati
          const already = pc
            .getSenders()
            .find((s) => s.track && s.track.id === track.id);
          if (!already) {
            // Use addTransceiver for screen share tracks
            const transceiver = pc.addTransceiver(track, {
              direction: "sendrecv",
              streams: [screenStream],
            });

            // Register mapping with StreamMappingManager for screen share
            // The MID might not be available immediately, so we'll use a delayed approach
            const registerMapping = () => {
              if (this.streamMappingManager && transceiver.mid) {
                const streamUUID = this.streamMappingManager.generateStreamUUID(
                  this.globalState.myId,
                  "screenshare",
                  streamId // screen share tracks use participantId_StreamID format
                );

                this.streamMappingManager.registerLocalTransceiverMapping(
                  transceiver,
                  streamUUID,
                  "screenshare",
                  this.globalState.myId
                );

                logger.debug(
                  "PeerConnectionManager",
                  `Screen share mapping registered: MID ${transceiver.mid} -> ${streamUUID}`
                );
                return true;
              }
              return false;
            };

            // Try to register immediately, if it fails, set up a delayed retry
            if (!registerMapping()) {
              // MID not available yet, set up a check in the next event loop cycles
              let retryCount = 0;
              const maxRetries = 10;
              const retryInterval = setInterval(() => {
                if (registerMapping() || retryCount >= maxRetries) {
                  clearInterval(retryInterval);
                  if (retryCount >= maxRetries) {
                    logger.warning(
                      "PeerConnectionManager",
                      `Failed to register screen share mapping after ${maxRetries} retries for ${streamId}`
                    );
                  }
                }
                retryCount++;
              }, 50); // Check every 50ms
            }

            logger.debug(
              "PeerConnectionManager",
              `Screen share track aggiunta: ${streamId}/${track.kind}, MID: ${
                transceiver.mid || "pending"
              }`
            );
          }
        });
      }
    });
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
      const remoteStream = this.globalState.remoteStreams[participantId];
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        this.globalState.removeRemoteStream(participantId);
      }

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
