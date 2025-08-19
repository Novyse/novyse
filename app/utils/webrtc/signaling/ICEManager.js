import { Platform } from "react-native";
import WebRTCLogger from "../logging/WebRTCLogger.js";
import { GlobalState } from "../core/GlobalState.js";
import Compatibility from "../utils/compatibility.js";
import { Helpers } from "../utils/helpers.js";

const { RTCIceCandidate } = Compatibility.getWebRTCLib();

/**
 * ICEManager - Gestisce tutte le operazioni ICE (Interactive Connectivity Establishment)
 * Include gestione candidati ICE, SDP processing, e connettività di rete
 */
export class ICEManager {
  constructor(globalState, logger) {
    this.logger = logger || WebRTCLogger;
    this.globalState = globalState || null;

    // Configurazioni per retry e timeout
    this.MAX_ICE_RETRY_ATTEMPTS = Platform.OS === "android" ? 3 : 1;
    this.ICE_CANDIDATE_TIMEOUT = 10000; // 10 secondi
    this.ICE_GATHERING_TIMEOUT = 15000; // 15 secondi

    this.logger.debug("ICEManager inizializzato", {
      component: "ICEManager",
      platform: Platform.OS,
      maxRetryAttempts: this.MAX_ICE_RETRY_ATTEMPTS,
    });
  }

  /**
   * Gestisce un messaggio candidato ICE ricevuto
   * @param {Object} message - Messaggio contenente il candidato ICE
   * @returns {Promise<boolean>}
   */
  async handleCandidateMessage(message) {
    this.logger.debug("Gestione messaggio candidato ICE ricevuto", {
      component: "ICEManager",
      from: message.from,
      action: "handleCandidate",
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const participantId = message.from;
    const pc = this.globalState.getPeerConnection(participantId);

    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${participantId}`, {
        component: "ICEManager",
        participantId,
      });
      return false;
    }

    try {
      if (message.candidate) {
        this.logger.debug(`Candidato ICE ricevuto da ${participantId}`, {
          component: "ICEManager",
          participantId,
          candidateType: message.candidate.type,
          protocol: message.candidate.protocol,
          foundation: message.candidate.foundation,
        });

        const candidate = new RTCIceCandidate(message.candidate);

        // Verifica se remote description è impostata
        if (!pc.remoteDescription) {
          this.logger.info(
            `Remote description non ancora impostata per ${participantId}, accodamento candidato`,
            {
              component: "ICEManager",
              participantId,
            }
          );
          this._queueICECandidate(participantId, candidate);
          return true;
        }

        // Tenta di aggiungere il candidato con retry logic per Android
        await this._addICECandidateWithRetry(participantId, candidate);
        return true;
      } else {
        // Fine candidati ICE (null candidate)
        this.logger.info(`Fine candidati ICE per ${participantId}`, {
          component: "ICEManager",
          participantId,
        });

        if (pc.remoteDescription) {
          await pc.addIceCandidate(null);
        }
        return true;
      }
    } catch (error) {
      this.logger.error(`Errore gestione candidato ICE per ${participantId}`, {
        component: "ICEManager",
        participantId,
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Configura i gestori di eventi ICE per una PeerConnection
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   */
  setupICEEventHandlers(pc, participantId) {
    this.logger.debug(
      `Configurazione gestori eventi ICE per ${participantId}`,
      {
        component: "ICEManager",
        participantId,
      }
    );

    // Gestione generazione candidati ICE
    pc.onicecandidate = (event) => {
      this._handleICECandidateGenerated(event, participantId);
    };

    // Monitoraggio stato connessione ICE
    pc.oniceconnectionstatechange = () => {
      this._handleICEConnectionStateChange(pc, participantId);
    };

    // Monitoraggio stato raccolta ICE
    pc.onicegatheringstatechange = () => {
      this._handleICEGatheringStateChange(pc, participantId);
    };

    // Timeout per raccolta ICE
    this._setupICEGatheringTimeout(participantId);
  }
  /**
   * Processa tutti i candidati ICE in coda per un partecipante
   * @param {string} participantId - ID del partecipante
   * @returns {Promise<void>}
   */
  async processQueuedICECandidates(participantId) {
    const queuedCandidates =
      this.globalState.getQueuedICECandidates(participantId);

    if (!queuedCandidates || queuedCandidates.length === 0) {
      return;
    }

    this.logger.info(
      `Processando ${queuedCandidates.length} candidati ICE in coda per ${participantId}`,
      {
        component: "ICEManager",
        participantId,
        candidatesCount: queuedCandidates.length,
      }
    );

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      this.logger.error(
        `PeerConnection non trovata per processare candidati in coda: ${participantId}`,
        {
          component: "ICEManager",
          participantId,
        }
      );
      return;
    }

    // Check if remote description is set before processing
    if (!pc.remoteDescription) {
      this.logger.warning(
        `Remote description still not set for ${participantId}, keeping candidates queued`,
        {
          component: "ICEManager",
          participantId,
        }
      );
      return;
    }

    // Process candidates in chronological order with retry logic
    let processedCount = 0;
    for (const candidate of queuedCandidates) {
      try {
        await this._addICECandidateWithRetry(participantId, candidate);

        // Mark candidate as processed to prevent duplicate processing
        this.globalState.markICECandidateAsProcessed(participantId, candidate);
        processedCount++;

        // Small delay between candidates to prevent overwhelming the connection
        if (processedCount < queuedCandidates.length) {
          await this._delayBetweenCandidates();
        }
      } catch (error) {
        this.logger.error(
          `Errore processando candidato ICE dalla coda per ${participantId}`,
          {
            component: "ICEManager",
            participantId,
            error: error.message,
            candidateIndex: processedCount,
          }
        );
        // Continue processing other candidates even if one fails
      }
    }

    this.logger.info(
      `Processati ${processedCount}/${queuedCandidates.length} candidati ICE per ${participantId}`,
      {
        component: "ICEManager",
        participantId,
        processedCount,
        totalCount: queuedCandidates.length,
      }
    );

    // Clear only processed candidates, keeping any new ones that arrived during processing
    this._cleanupProcessedCandidates(participantId);
  }

  /**
   * Reimposta lo stato ICE per un partecipante (per riconnessioni)
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   */ resetICEState(participantId) {
    this.logger.info(`Reset stato ICE per ${participantId}`, {
      component: "ICEManager",
      participantId,
      action: "resetICEState",
    });

    // Pulisci coda candidati ICE
    this.globalState.clearQueuedICECandidates(participantId);

    // Pulisci timeout ICE gathering se presente
    this._clearICEGatheringTimeout(participantId);
  }

  /**
   * Handles a remote ICE candidate for SignalingManager integration
   * @param {string} participantId - ID of the participant
   * @param {Object} candidateData - The ICE candidate data
   * @returns {Promise<boolean>}
   */
  async handleRemoteCandidate(participantId, candidateData) {
    this.logger.debug(`Handling remote ICE candidate for ${participantId}`, {
      component: "ICEManager",
      participantId,
      candidateType: candidateData?.type,
    });

    const pc = this.globalState.getPeerConnection(participantId);

    if (!pc) {
      this.logger.error(`PeerConnection not found for ${participantId}`, {
        component: "ICEManager",
        participantId,
      });
      return false;
    }

    try {
      if (candidateData) {
        const candidate = new RTCIceCandidate(candidateData);

        // Check if remote description is set
        if (!pc.remoteDescription) {
          this.logger.info(
            `Remote description not set for ${participantId}, queuing candidate`,
            {
              component: "ICEManager",
              participantId,
            }
          );
          this._queueICECandidate(participantId, candidate);
          return true;
        }

        // Add candidate with retry logic
        await this._addICECandidateWithRetry(participantId, candidate);
        return true;
      } else {
        // End of candidates (null candidate)
        this.logger.info(`End of ICE candidates for ${participantId}`, {
          component: "ICEManager",
          participantId,
        });

        if (pc.remoteDescription) {
          await pc.addIceCandidate(null);
        }
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Error handling remote ICE candidate for ${participantId}`,
        {
          component: "ICEManager",
          participantId,
          error: error.message,
        }
      );
      return false;
    }
  }

  /**
   * Processes queued ICE candidates for SignalingManager integration
   * @param {string} participantId - ID of the participant
   * @returns {Promise<void>}
   */
  async processQueuedCandidates(participantId) {
    return await this.processQueuedICECandidates(participantId);
  }

  /**
   * Ottiene statistiche ICE per debug
   * @param {string} participantId - ID del partecipante
   * @returns {Object|null}
   */
  async getICEStatistics(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      return null;
    }

    try {
      const stats = await pc.getStats();
      const iceStats = {
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        candidates: {
          local: [],
          remote: [],
        },
        selectedPair: null,
      };

      stats.forEach((report) => {
        if (report.type === "local-candidate") {
          iceStats.candidates.local.push({
            type: report.candidateType,
            protocol: report.protocol,
            address: report.address,
            port: report.port,
          });
        } else if (report.type === "remote-candidate") {
          iceStats.candidates.remote.push({
            type: report.candidateType,
            protocol: report.protocol,
            address: report.address,
            port: report.port,
          });
        } else if (report.type === "candidate-pair" && report.selected) {
          iceStats.selectedPair = {
            state: report.state,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
            totalRoundTripTime: report.totalRoundTripTime,
            currentRoundTripTime: report.currentRoundTripTime,
          };
        }
      });

      return iceStats;
    } catch (error) {
      this.logger.error(
        `Errore ottenendo statistiche ICE per ${participantId}`,
        {
          component: "ICEManager",
          participantId,
          error: error.message,
        }
      );
      return null;
    }
  }

  /**
   * Gestisce la generazione di un candidato ICE locale
   * @param {RTCPeerConnectionIceEvent} event - Evento candidato ICE
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _handleICECandidateGenerated(event, participantId) {
    if (event.candidate) {
      this.logger.debug(`Candidato ICE generato per ${participantId}`, {
        component: "ICEManager",
        participantId,
        candidateType: event.candidate.type,
        protocol: event.candidate.protocol,
      });

      // Invia candidato tramite WebSocket utilizzando direttamente IceCandidate
      const SocketMethods = require("../../socketMethods.js").default;
      SocketMethods.IceCandidate({
        candidate: event.candidate.toJSON(),
        to: participantId,
        from: this.globalState.getMyId(),
        chat: this.globalState.getChatId(),
      });
    } else {
      this.logger.info(
        `Raccolta candidati ICE completata per ${participantId}`,
        {
          component: "ICEManager",
          participantId,
        }
      );
    }
  }

  /**
   * Gestisce i cambiamenti di stato della connessione ICE
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _handleICEConnectionStateChange(pc, participantId) {
    const state = pc.iceConnectionState;

    this.logger.info(`Stato connessione ICE per ${participantId}: ${state}`, {
      component: "ICEManager",
      participantId,
      iceConnectionState: state,
    });

    // Notifica il callback se disponibile
    const callback = this.globalState.getCallback(
      "onPeerConnectionStateChange"
    );
    if (callback) {
      callback(participantId, "ice", state);
    }

    // Gestisci stati critici
    switch (state) {
      case "connected":
      case "completed":
        this.logger.info(
          `Connessione ICE stabilita con successo per ${participantId}`,
          {
            component: "ICEManager",
            participantId,
            iceConnectionState: state,
          }
        );
        break;

      case "disconnected":
        this.logger.warning(
          `Connessione ICE disconnessa per ${participantId}`,
          {
            component: "ICEManager",
            participantId,
            iceConnectionState: state,
          }
        );
        break;

      case "failed":
        this.logger.error(`Connessione ICE fallita per ${participantId}`, {
          component: "ICEManager",
          participantId,
          iceConnectionState: state,
        });
        break;

      case "closed":
        this.logger.info(`Connessione ICE chiusa per ${participantId}`, {
          component: "ICEManager",
          participantId,
          iceConnectionState: state,
        });
        break;
    }
  }

  /**
   * Gestisce i cambiamenti di stato della raccolta ICE
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _handleICEGatheringStateChange(pc, participantId) {
    const state = pc.iceGatheringState;

    this.logger.debug(`Stato raccolta ICE per ${participantId}: ${state}`, {
      component: "ICEManager",
      participantId,
      iceGatheringState: state,
    });

    if (state === "complete") {
      this._clearICEGatheringTimeout(participantId);
    }
  }

  /**
   * Aggiunge un candidato ICE con retry logic
   * @param {string} participantId - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE
   * @returns {Promise<void>}
   * @private
   */
  async _addICECandidateWithRetry(participantId, candidate) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      throw new Error(`PeerConnection non trovata per ${participantId}`);
    }

    let retryCount = 0;
    const maxRetries = this.MAX_ICE_RETRY_ATTEMPTS;

    while (retryCount < maxRetries) {
      try {
        await pc.addIceCandidate(candidate);

        this.logger.debug(
          `Candidato ICE aggiunto con successo per ${participantId}`,
          {
            component: "ICEManager",
            participantId,
            attempt: retryCount + 1,
          }
        );

        return; // Successo, esci dal loop
      } catch (error) {
        retryCount++;

        this.logger.warning(
          `Tentativo ${retryCount}/${maxRetries} fallito per candidato ICE di ${participantId}`,
          {
            component: "ICEManager",
            participantId,
            attempt: retryCount,
            maxRetries,
            error: error.message,
          }
        );

        if (retryCount < maxRetries) {
          // Aspetta prima del prossimo tentativo (exponential backoff)
          await Helpers.delay(100 * Math.pow(2, retryCount));
        } else {
          // Tutti i tentativi falliti
          this.logger.error(
            `Tutti i tentativi falliti per candidato ICE di ${participantId}`,
            {
              component: "ICEManager",
              participantId,
              totalAttempts: retryCount,
              error: error.message,
            }
          );
          throw error;
        }
      }
    }
  }

  /**
   * Accoda un candidato ICE se remote description non è ancora impostata
   * @param {string} participantId - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE
   * @returns {void}
   * @private
   */
  _queueICECandidate(participantId, candidate) {
    this.globalState.queueICECandidate(participantId, candidate);

    this.logger.debug(`Candidato ICE accodato per ${participantId}`, {
      component: "ICEManager",
      participantId,
      queueLength:
        this.globalState.getQueuedICECandidates(participantId).length,
    });
  }

  /**
   * Configura timeout per raccolta ICE
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _setupICEGatheringTimeout(participantId) {
    const timeoutId = setTimeout(() => {
      const pc = this.globalState.getPeerConnection(participantId);
      if (pc && pc.iceGatheringState !== "complete") {
        this.logger.warning(`Timeout raccolta ICE per ${participantId}`, {
          component: "ICEManager",
          participantId,
          iceGatheringState: pc.iceGatheringState,
          timeout: this.ICE_GATHERING_TIMEOUT,
        });
      }
    }, this.ICE_GATHERING_TIMEOUT);

    this.globalState.setICEGatheringTimeout(participantId, timeoutId);
  }
  /**
   * Pulisce il timeout di raccolta ICE
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _clearICEGatheringTimeout(participantId) {
    const timeoutId = this.globalState.getICEGatheringTimeout(participantId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.globalState.clearICEGatheringTimeout(participantId);
    }
  }

  /**
   * Adds a small delay between ICE candidate processing to prevent overwhelming
   * @returns {Promise<void>}
   * @private
   */
  async _delayBetweenCandidates() {
    // Smaller delay for better performance, but prevents overwhelming the connection
    const delay = Platform.OS === "android" ? 10 : 5; // ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Cleanup processed ICE candidates from queue while preserving new ones
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   * @private
   */
  _cleanupProcessedCandidates(participantId) {
    const allEntries =
      this.globalState.getQueuedICECandidateEntries(participantId);
    const unprocessedEntries = allEntries.filter((entry) => !entry.processed);

    // Replace queue with only unprocessed candidates
    this.globalState.iceCandidateQueues[participantId] = unprocessedEntries;

    this.logger.debug(
      `Cleaned up processed ICE candidates for ${participantId}`,
      {
        component: "ICEManager",
        participantId,
        totalEntries: allEntries.length,
        remainingEntries: unprocessedEntries.length,
      }
    );
  }

  /**
   * Verifica se il messaggio è destinato a questo client
   * @param {Object} message - Messaggio da verificare
   * @returns {boolean}
   * @private
   */
  _isMessageForMe(message) {
    const myId = this.globalState.getMyId();
    const chatId = this.globalState.getChatId();

    return message.to === myId && message.chat === chatId;
  }

  /**
   * Pulisce tutte le risorse ICE
   * @returns {void}
   */
  cleanup() {
    this.logger.info("Pulizia ICEManager", {
      component: "ICEManager",
      action: "cleanup",
    });

    // Pulisci tutti i timeout ICE gathering
    const participantIds = this.globalState.getAllPeerConnectionIds();
    participantIds.forEach((participantId) => {
      this._clearICEGatheringTimeout(participantId);
    });
  }
}

// Default export for Expo Router compatibility
export default ICEManager;
