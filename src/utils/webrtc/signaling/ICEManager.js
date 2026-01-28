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
      deviceUUID: message.deviceUUID,
      action: "handleCandidate",
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const deviceUUID = message.deviceUUID;
    const pc = this.globalState.getPeerConnection(deviceUUID);

    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
      });
      return false;
    }

    try {
      if (message.candidate) {
        this.logger.debug(`Candidato ICE ricevuto da ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
          candidateType: message.candidate.type,
          protocol: message.candidate.protocol,
          foundation: message.candidate.foundation,
        });

        const candidate = new RTCIceCandidate(message.candidate);

        // Verifica se remote description è impostata
        if (!pc.remoteDescription) {
          this.logger.info(
            `Remote description non ancora impostata per ${deviceUUID}, accodamento candidato`,
            {
              component: "ICEManager",
              deviceUUID,
            }
          );
          this._queueICECandidate(deviceUUID, candidate);
          return true;
        }

        // Tenta di aggiungere il candidato con retry logic per Android
        await this._addICECandidateWithRetry(deviceUUID, candidate);
        return true;
      } else {
        // Fine candidati ICE (null candidate)
        this.logger.info(`Fine candidati ICE per ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
        });

        if (pc.remoteDescription) {
          await pc.addIceCandidate(null);
        }
        return true;
      }
    } catch (error) {
      this.logger.error(`Errore gestione candidato ICE per ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Configura i gestori di eventi ICE per una PeerConnection
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   */
  setupICEEventHandlers(pc, deviceUUID) {
    this.logger.debug(`Configurazione gestori eventi ICE per ${deviceUUID}`, {
      component: "ICEManager",
      deviceUUID,
    });

    // Gestione generazione candidati ICE
    pc.onicecandidate = (event) => {
      this._handleICECandidateGenerated(event, deviceUUID);
    };

    // Monitoraggio stato connessione ICE
    pc.oniceconnectionstatechange = () => {
      this._handleICEConnectionStateChange(pc, deviceUUID);
    };

    // Monitoraggio stato raccolta ICE
    pc.onicegatheringstatechange = () => {
      this._handleICEGatheringStateChange(pc, deviceUUID);
    };

    // Timeout per raccolta ICE
    this._setupICEGatheringTimeout(deviceUUID);
  }
  /**
   * Processa tutti i candidati ICE in coda per un partecipante
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Promise<void>}
   */
  async processQueuedICECandidates(deviceUUID) {
    const queuedCandidates =
      this.globalState.getQueuedICECandidates(deviceUUID);

    if (!queuedCandidates || queuedCandidates.length === 0) {
      return;
    }

    this.logger.info(
      `Processando ${queuedCandidates.length} candidati ICE in coda per ${deviceUUID}`,
      {
        component: "ICEManager",
        deviceUUID,
        candidatesCount: queuedCandidates.length,
      }
    );

    const pc = this.globalState.getPeerConnection(deviceUUID);
    if (!pc) {
      this.logger.error(
        `PeerConnection non trovata per processare candidati in coda: ${deviceUUID}`,
        {
          component: "ICEManager",
          deviceUUID,
        }
      );
      return;
    }

    // Check if remote description is set before processing
    if (!pc.remoteDescription) {
      this.logger.warning(
        `Remote description still not set for ${deviceUUID}, keeping candidates queued`,
        {
          component: "ICEManager",
          deviceUUID,
        }
      );
      return;
    }

    // Process candidates in chronological order with retry logic
    let processedCount = 0;
    for (const candidate of queuedCandidates) {
      try {
        await this._addICECandidateWithRetry(deviceUUID, candidate);

        // Mark candidate as processed to prevent duplicate processing
        this.globalState.markICECandidateAsProcessed(deviceUUID, candidate);
        processedCount++;

        // Small delay between candidates to prevent overwhelming the connection
        if (processedCount < queuedCandidates.length) {
          await this._delayBetweenCandidates();
        }
      } catch (error) {
        this.logger.error(
          `Errore processando candidato ICE dalla coda per ${deviceUUID}`,
          {
            component: "ICEManager",
            deviceUUID,
            error: error.message,
            candidateIndex: processedCount,
          }
        );
        // Continue processing other candidates even if one fails
      }
    }

    this.logger.info(
      `Processati ${processedCount}/${queuedCandidates.length} candidati ICE per ${deviceUUID}`,
      {
        component: "ICEManager",
        deviceUUID,
        processedCount,
        totalCount: queuedCandidates.length,
      }
    );

    // Clear only processed candidates, keeping any new ones that arrived during processing
    this._cleanupProcessedCandidates(deviceUUID);
  }

  /**
   * Reimposta lo stato ICE per un partecipante (per riconnessioni)
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   */ resetICEState(deviceUUID) {
    this.logger.info(`Reset stato ICE per ${deviceUUID}`, {
      component: "ICEManager",
      deviceUUID,
      action: "resetICEState",
    });

    // Pulisci coda candidati ICE
    this.globalState.clearQueuedICECandidates(deviceUUID);

    // Pulisci timeout ICE gathering se presente
    this._clearICEGatheringTimeout(deviceUUID);
  }

  /**
   * Handles a remote ICE candidate for SignalingManager integration
   * @param {string} deviceUUID - ID of the participant
   * @param {Object} candidateData - The ICE candidate data
   * @returns {Promise<boolean>}
   */
  async handleRemoteCandidate(deviceUUID, candidateData) {
    this.logger.debug(`Handling remote ICE candidate for ${deviceUUID}`, {
      component: "ICEManager",
      deviceUUID,
      candidateType: candidateData?.type,
    });

    const pc = this.globalState.getPeerConnection(deviceUUID);

    if (!pc) {
      this.logger.error(`PeerConnection not found for ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
      });
      return false;
    }

    try {
      if (candidateData) {
        const candidate = new RTCIceCandidate(candidateData);

        // Check if remote description is set
        if (!pc.remoteDescription) {
          this.logger.info(
            `Remote description not set for ${deviceUUID}, queuing candidate`,
            {
              component: "ICEManager",
              deviceUUID,
            }
          );
          this._queueICECandidate(deviceUUID, candidate);
          return true;
        }

        // Add candidate with retry logic
        await this._addICECandidateWithRetry(deviceUUID, candidate);
        return true;
      } else {
        // End of candidates (null candidate)
        this.logger.info(`End of ICE candidates for ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
        });

        if (pc.remoteDescription) {
          await pc.addIceCandidate(null);
        }
        return true;
      }
    } catch (error) {
      this.logger.error(
        `Error handling remote ICE candidate for ${deviceUUID}`,
        {
          component: "ICEManager",
          deviceUUID,
          error: error.message,
        }
      );
      return false;
    }
  }

  /**
   * Processes queued ICE candidates for SignalingManager integration
   * @param {string} deviceUUID - ID of the participant
   * @returns {Promise<void>}
   */
  async processQueuedCandidates(deviceUUID) {
    return await this.processQueuedICECandidates(deviceUUID);
  }

  /**
   * Ottiene statistiche ICE per debug
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Object|null}
   */
  async getICEStatistics(deviceUUID) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
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
      this.logger.error(`Errore ottenendo statistiche ICE per ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Gestisce la generazione di un candidato ICE locale
   * @param {RTCPeerConnectionIceEvent} event - Evento candidato ICE
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  async _handleICECandidateGenerated(event, deviceUUID) {
    if (event.candidate) {
      this.logger.debug(`Candidato ICE generato per ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
        candidateType: event.candidate.type,
        protocol: event.candidate.protocol,
      });

      // Invia candidato tramite WebSocket utilizzando direttamente IceCandidate
      const SocketIO = require("../../backend-services/socket-io.js").default;
      await SocketIO.send().IceCandidate({
        candidate: event.candidate.toJSON(),
        toDeviceUUID: deviceUUID,
        deviceUUID: this.globalState.getDeviceUUID(),
        commUUID: this.globalState.getCommUUID(),
      });
    } else {
      this.logger.info(`Raccolta candidati ICE completata per ${deviceUUID}`, {
        component: "ICEManager",
        deviceUUID,
      });
    }
  }

  /**
   * Gestisce i cambiamenti di stato della connessione ICE
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  _handleICEConnectionStateChange(pc, deviceUUID) {
    const state = pc.iceConnectionState;

    this.logger.info(`Stato connessione ICE per ${deviceUUID}: ${state}`, {
      component: "ICEManager",
      deviceUUID,
      iceConnectionState: state,
    });

    // Notifica il callback se disponibile
    const callback = this.globalState.getCallback(
      "onPeerConnectionStateChange"
    );
    if (callback) {
      callback(deviceUUID, "ice", state);
    }

    // Gestisci stati critici
    switch (state) {
      case "connected":
      case "completed":
        this.logger.info(
          `Connessione ICE stabilita con successo per ${deviceUUID}`,
          {
            component: "ICEManager",
            deviceUUID,
            iceConnectionState: state,
          }
        );
        break;

      case "disconnected":
        this.logger.warning(`Connessione ICE disconnessa per ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
          iceConnectionState: state,
        });
        break;

      case "failed":
        this.logger.error(`Connessione ICE fallita per ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
          iceConnectionState: state,
        });
        break;

      case "closed":
        this.logger.info(`Connessione ICE chiusa per ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
          iceConnectionState: state,
        });
        break;
    }
  }

  /**
   * Gestisce i cambiamenti di stato della raccolta ICE
   * @param {RTCPeerConnection} pc - La peer connection
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  _handleICEGatheringStateChange(pc, deviceUUID) {
    const state = pc.iceGatheringState;

    this.logger.debug(`Stato raccolta ICE per ${deviceUUID}: ${state}`, {
      component: "ICEManager",
      deviceUUID,
      iceGatheringState: state,
    });

    if (state === "complete") {
      this._clearICEGatheringTimeout(deviceUUID);
    }
  }

  /**
   * Aggiunge un candidato ICE con retry logic
   * @param {string} deviceUUID - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE
   * @returns {Promise<void>}
   * @private
   */
  async _addICECandidateWithRetry(deviceUUID, candidate) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
    if (!pc) {
      throw new Error(`PeerConnection non trovata per ${deviceUUID}`);
    }

    let retryCount = 0;
    const maxRetries = this.MAX_ICE_RETRY_ATTEMPTS;

    while (retryCount < maxRetries) {
      try {
        await pc.addIceCandidate(candidate);

        this.logger.debug(
          `Candidato ICE aggiunto con successo per ${deviceUUID}`,
          {
            component: "ICEManager",
            deviceUUID,
            attempt: retryCount + 1,
          }
        );

        return; // Successo, esci dal loop
      } catch (error) {
        retryCount++;

        this.logger.warning(
          `Tentativo ${retryCount}/${maxRetries} fallito per candidato ICE di ${deviceUUID}`,
          {
            component: "ICEManager",
            deviceUUID,
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
            `Tutti i tentativi falliti per candidato ICE di ${deviceUUID}`,
            {
              component: "ICEManager",
              deviceUUID,
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
   * @param {string} deviceUUID - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE
   * @returns {void}
   * @private
   */
  _queueICECandidate(deviceUUID, candidate) {
    this.globalState.queueICECandidate(deviceUUID, candidate);

    this.logger.debug(`Candidato ICE accodato per ${deviceUUID}`, {
      component: "ICEManager",
      deviceUUID,
      queueLength: this.globalState.getQueuedICECandidates(deviceUUID).length,
    });
  }

  /**
   * Configura timeout per raccolta ICE
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  _setupICEGatheringTimeout(deviceUUID) {
    const timeoutId = setTimeout(() => {
      const pc = this.globalState.getPeerConnection(deviceUUID);
      if (pc && pc.iceGatheringState !== "complete") {
        this.logger.warning(`Timeout raccolta ICE per ${deviceUUID}`, {
          component: "ICEManager",
          deviceUUID,
          iceGatheringState: pc.iceGatheringState,
          timeout: this.ICE_GATHERING_TIMEOUT,
        });
      }
    }, this.ICE_GATHERING_TIMEOUT);

    this.globalState.setICEGatheringTimeout(deviceUUID, timeoutId);
  }
  /**
   * Pulisce il timeout di raccolta ICE
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  _clearICEGatheringTimeout(deviceUUID) {
    const timeoutId = this.globalState.getICEGatheringTimeout(deviceUUID);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.globalState.clearICEGatheringTimeout(deviceUUID);
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
   * @param {string} deviceUUID - ID del partecipante
   * @returns {void}
   * @private
   */
  _cleanupProcessedCandidates(deviceUUID) {
    const allEntries =
      this.globalState.getQueuedICECandidateEntries(deviceUUID);
    const unprocessedEntries = allEntries.filter((entry) => !entry.processed);

    // Replace queue with only unprocessed candidates
    this.globalState.iceCandidateQueues[deviceUUID] = unprocessedEntries;

    this.logger.debug(`Cleaned up processed ICE candidates for ${deviceUUID}`, {
      component: "ICEManager",
      deviceUUID,
      totalEntries: allEntries.length,
      remainingEntries: unprocessedEntries.length,
    });
  }

  /**
   * Verifica se il messaggio è destinato a questo client
   * @param {Object} message - Messaggio da verificare
   * @returns {boolean}
   * @private
   */
  _isMessageForMe(message) {
    const deviceUUID = this.globalState.getDeviceUUID();
    const commUUID = this.globalState.getCommUUID();

    return message.toDeviceUUID === deviceUUID && message.commUUID === commUUID;
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
    const deviceUUIDs = this.globalState.getAllPeerConnectionIds();
    deviceUUIDs.forEach((deviceUUID) => {
      this._clearICEGatheringTimeout(deviceUUID);
    });
  }
}

// Default export for Expo Router compatibility
export default ICEManager;
