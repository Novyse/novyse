import WebRTCLogger from "../logging/WebRTCLogger.js";
import { GlobalState } from "../core/GlobalState.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";

/**
 * RecoveryManager - Handles WebRTC connection recovery and repair
 * Implements multiple recovery strategies with retry policies
 */
export class RecoveryManager {
  constructor(globalState, logger) {
    this.logger = logger || WebRTCLogger;
    this.globalState = globalState || new GlobalState();

    // Recovery configuration
    this.MAX_RECONNECTION_ATTEMPTS =
      WEBRTC_CONSTANTS.MAX_RECONNECTION_ATTEMPTS || 3;
    this.RECONNECTION_BASE_DELAY =
      WEBRTC_CONSTANTS.RECONNECTION_BASE_DELAY || 2000;
    this.CONNECTION_TIMEOUT = WEBRTC_CONSTANTS.CONNECTION_TIMEOUT || 30000;
    this.STABILIZATION_TIMEOUT =
      WEBRTC_CONSTANTS.STABILIZATION_TIMEOUT || 15000;

    // Recovery state tracking
    this.reconnectionAttempts = {};
    this.recoveryInProgress = {};
    this.lastRecoveryAttempts = {};

    // Recovery strategies
    this.RECOVERY_STRATEGIES = {
      ICE_RESTART: "ice_restart",
      RENEGOTIATION: "renegotiation",
      FULL_RECONNECTION: "full_reconnection",
    };

    this.logger.info("RecoveryManager", "Recovery manager initialized");
  }

  /**
   * Attempt connection recovery for a participant
   * @param {string} participantId - Participant ID to recover
   * @returns {Promise<boolean>} True if recovery was successful
   */
  async attemptConnectionRecovery(participantId) {
    if (!participantId) {
      this.logger.warn(
        "RecoveryManager",
        "Cannot recover empty participant ID"
      );
      return false;
    }

    // Check if recovery is already in progress
    if (this.recoveryInProgress[participantId]) {
      this.logger.info(
        "RecoveryManager",
        `Recovery already in progress for ${participantId}`
      );
      return false;
    }

    // Check retry limits
    const currentAttempts = this.reconnectionAttempts[participantId] || 0;
    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      this.logger.error(
        "RecoveryManager",
        `Max recovery attempts (${this.MAX_RECONNECTION_ATTEMPTS}) reached for ${participantId}`
      );
      return false;
    }

    this.recoveryInProgress[participantId] = true;
    this.reconnectionAttempts[participantId] = currentAttempts + 1;
    this.lastRecoveryAttempts[participantId] = Date.now();

    this.logger.warn(
      "RecoveryManager",
      `Starting recovery attempt ${this.reconnectionAttempts[participantId]}/${this.MAX_RECONNECTION_ATTEMPTS} for ${participantId}`
    );

    try {
      const success = await this._performConnectionRecovery(participantId);

      if (success) {
        this.reconnectionAttempts[participantId] = 0; // Reset on success
        this.logger.info(
          "RecoveryManager",
          `Recovery successful for ${participantId}`
        );
      } else {
        this.logger.warn(
          "RecoveryManager",
          `Recovery attempt failed for ${participantId}`
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Recovery error for ${participantId}: ${error.message}`
      );
      return false;
    } finally {
      this.recoveryInProgress[participantId] = false;
    }
  }

  /**
   * Force manual reconnection for a participant
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} True if reconnection was initiated
   */
  async forceReconnection(participantId) {
    if (!participantId) return false;

    this.logger.info(
      "RecoveryManager",
      `Forcing manual reconnection for ${participantId}`
    );

    // Reset attempt counter for manual retry
    this.reconnectionAttempts[participantId] = 0;

    return await this.attemptConnectionRecovery(participantId);
  }

  /**
   * Reset reconnection attempts for a participant
   * @param {string} participantId - Participant ID
   */
  resetReconnectionAttempts(participantId) {
    if (this.reconnectionAttempts[participantId]) {
      delete this.reconnectionAttempts[participantId];
      this.logger.debug(
        "RecoveryManager",
        `Reset reconnection attempts for ${participantId}`
      );
    }
  }

  /**
   * Get recovery statistics for a participant
   * @param {string} participantId - Participant ID
   * @returns {Object} Recovery statistics
   */
  getRecoveryStatistics(participantId) {
    return {
      participantId,
      reconnectionAttempts: this.reconnectionAttempts[participantId] || 0,
      maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
      recoveryInProgress: !!this.recoveryInProgress[participantId],
      lastRecoveryTime: this.lastRecoveryAttempts[participantId] || null,
      canAttemptRecovery:
        (this.reconnectionAttempts[participantId] || 0) <
        this.MAX_RECONNECTION_ATTEMPTS,
    };
  }

  /**
   * Get recovery statistics for all participants
   * @returns {Object} All recovery statistics
   */
  getAllRecoveryStatistics() {
    const stats = {};

    // Include active recovery states
    [
      ...Object.keys(this.reconnectionAttempts),
      ...Object.keys(this.recoveryInProgress),
    ].forEach((participantId) => {
      stats[participantId] = this.getRecoveryStatistics(participantId);
    });

    return stats;
  }

  /**
   * Perform the actual connection recovery
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} Recovery success
   * @private
   */
  async _performConnectionRecovery(participantId) {
    const currentAttempt = this.reconnectionAttempts[participantId];
    const pc = this.globalState.getPeerConnection(participantId);

    if (!pc) {
      throw new Error(`No peer connection found for ${participantId}`);
    }

    // Add exponential backoff delay
    const delay =
      this.RECONNECTION_BASE_DELAY * Math.pow(2, currentAttempt - 1);
    if (delay > 0) {
      this.logger.debug(
        "RecoveryManager",
        `Waiting ${delay}ms before recovery attempt for ${participantId}`
      );
      await this._wait(delay);
    }

    // Try different recovery strategies based on attempt number
    try {
      if (currentAttempt === 1) {
        // Strategy 1: ICE restart (lightest approach)
        return await this._performICERestart(participantId);
      } else if (currentAttempt === 2) {
        // Strategy 2: Full renegotiation
        return await this._performRenegotiation(participantId);
      } else {
        // Strategy 3: Full reconnection (most aggressive)
        return await this._performFullReconnection(participantId);
      }
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Recovery strategy failed for ${participantId}: ${error.message}`
      );
      return false;
    }
  }
  /**
   * Perform ICE restart recovery
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performICERestart(participantId) {
    this.logger.info(
      "RecoveryManager",
      `Attempting ICE restart for ${participantId}`
    );

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) return false;

    try {
      // Use SignalingManager for reliable offer sending with retry
      const signalingManager = this.globalState.getSignalingManager();
      if (signalingManager) {
        // Create offer with ICE restart using signaling manager
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);

        // Send via signaling manager which has retry mechanisms
        const success = await this._sendOfferWithRetry(
          signalingManager,
          participantId,
          offer
        );

        if (!success) {
          throw new Error("Failed to send ICE restart offer after retries");
        }

        // Wait for connection stabilization
        const stabilized = await this._waitForConnectionStabilization(
          participantId
        );

        if (stabilized) {
          this.logger.info(
            "RecoveryManager",
            `ICE restart successful for ${participantId}`
          );
        }

        return stabilized;
      } else {
        // Fallback to direct WebSocket if no signaling manager
        this.logger.warn(
          "RecoveryManager",
          `No signaling manager available, using direct WebSocket for ${participantId}`
        );

        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);

        const SocketMethods = await import("../../socketMethods.js");
        const success = await this._sendWithRetry(
          () =>
            SocketMethods.default.RTCOffer({
              offer: offer.toJSON
                ? offer.toJSON()
                : { sdp: offer.sdp, type: offer.type },
              to: participantId,
              from: this.globalState.getMyId(),
            }),
          `ICE restart offer to ${participantId}`,
          3
        );

        if (!success) {
          throw new Error("Failed to send ICE restart offer via WebSocket");
        }

        return await this._waitForConnectionStabilization(participantId);
      }
    } catch (error) {
      this.logger.warn(
        "RecoveryManager",
        `ICE restart failed for ${participantId}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Perform full renegotiation recovery
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performRenegotiation(participantId) {
    this.logger.info(
      "RecoveryManager",
      `Attempting renegotiation for ${participantId}`
    );

    try {
      // Use signaling manager for safe renegotiation
      const signalingManager = this.globalState.getSignalingManager();
      if (signalingManager) {
        const offer = await signalingManager.createOffer(participantId);
        if (offer) {
          const success = await this._waitForConnectionStabilization(
            participantId
          );

          if (success) {
            this.logger.info(
              "RecoveryManager",
              `Renegotiation successful for ${participantId}`
            );
          }

          return success;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn(
        "RecoveryManager",
        `Renegotiation failed for ${participantId}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Perform full reconnection recovery
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performFullReconnection(participantId) {
    this.logger.info(
      "RecoveryManager",
      `Attempting full reconnection for ${participantId}`
    );

    try {
      // Get peer connection manager
      const peerConnectionManager = this.globalState.getPeerConnectionManager();
      if (!peerConnectionManager) {
        throw new Error("No peer connection manager available");
      }

      // Close existing connection
      const existingPc = this.globalState.getPeerConnection(participantId);
      if (existingPc) {
        existingPc.close();
      }

      // Remove from global state
      this.globalState.removePeerConnection(participantId);

      // Create new connection
      const userData = this.globalState.getUserData(participantId);
      if (userData) {
        const newPc = peerConnectionManager.createPeerConnection({
          from: participantId,
          handle: userData.handle,
        });

        if (newPc) {
          // Wait for connection stabilization
          const success = await this._waitForConnectionStabilization(
            participantId
          );

          if (success) {
            this.logger.info(
              "RecoveryManager",
              `Full reconnection successful for ${participantId}`
            );
          }

          return success;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Full reconnection failed for ${participantId}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Wait for connection to stabilize
   * @param {string} participantId - Participant ID
   * @returns {Promise<boolean>} True if connection stabilized
   * @private
   */
  async _waitForConnectionStabilization(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) return false;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 500; // Check every 500ms

      const checkConnection = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > this.STABILIZATION_TIMEOUT) {
          this.logger.warn(
            "RecoveryManager",
            `Connection stabilization timeout for ${participantId}`
          );
          resolve(false);
          return;
        }

        const connectionState = pc.connectionState;
        const iceConnectionState = pc.iceConnectionState;

        if (
          connectionState === "connected" ||
          (connectionState === "connecting" &&
            (iceConnectionState === "connected" ||
              iceConnectionState === "completed"))
        ) {
          this.logger.debug(
            "RecoveryManager",
            `Connection stabilized for ${participantId} (${connectionState}/${iceConnectionState})`
          );
          resolve(true);
          return;
        }

        if (
          connectionState === "failed" ||
          connectionState === "closed" ||
          iceConnectionState === "failed"
        ) {
          this.logger.warn(
            "RecoveryManager",
            `Connection failed during stabilization for ${participantId} (${connectionState}/${iceConnectionState})`
          );
          resolve(false);
          return;
        }

        // Continue checking
        setTimeout(checkConnection, checkInterval);
      };

      checkConnection();
    });
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
   * Send offer with retry mechanism via SignalingManager
   * @param {Object} signalingManager - SignalingManager instance
   * @param {string} participantId - Target participant ID
   * @param {RTCSessionDescription} offer - Offer to send
   * @returns {Promise<boolean>} True if sent successfully
   * @private
   */
  async _sendOfferWithRetry(signalingManager, participantId, offer) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use signaling manager's retry mechanism
        const SocketMethods = await import("../../socketMethods.js");

        if (!SocketMethods.default.isWebSocketOpen()) {
          this.logger.warn(
            "RecoveryManager",
            `WebSocket not connected for offer to ${participantId}, attempt ${attempt}/${maxRetries}`
          );

          if (attempt < maxRetries) {
            await this._wait(Math.min(1000 * attempt, 5000));
            continue;
          }
          return false;
        }

        await SocketMethods.default.RTCOffer({
          offer: offer.toJSON
            ? offer.toJSON()
            : { sdp: offer.sdp, type: offer.type },
          to: participantId,
          from: this.globalState.getMyId(),
          chat: this.globalState.getChatId(),
        });

        this.logger.debug(
          "RecoveryManager",
          `Offer sent successfully to ${participantId} on attempt ${attempt}`
        );
        return true;
      } catch (error) {
        this.logger.warn(
          "RecoveryManager",
          `Offer send failed to ${participantId} on attempt ${attempt}/${maxRetries}: ${error.message}`
        );

        if (attempt < maxRetries) {
          await this._wait(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
        }
      }
    }
    return false;
  }

  /**
   * Generic retry mechanism for WebSocket operations
   * @param {Function} sendFunction - Function that performs the send operation
   * @param {string} operationName - Name of the operation for logging
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<boolean>} True if operation succeeded
   * @private
   */
  async _sendWithRetry(sendFunction, operationName, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const SocketMethods = await import("../../socketMethods.js");

        if (!SocketMethods.default.isWebSocketOpen()) {
          this.logger.warn(
            "RecoveryManager",
            `WebSocket not connected for ${operationName}, attempt ${attempt}/${maxRetries}`
          );

          if (attempt < maxRetries) {
            await this._wait(Math.min(1000 * attempt, 5000));
            continue;
          }
          return false;
        }

        const result = await sendFunction();
        if (result === false) {
          throw new Error("WebSocket send returned false");
        }

        this.logger.debug(
          "RecoveryManager",
          `${operationName} sent successfully on attempt ${attempt}`
        );
        return true;
      } catch (error) {
        this.logger.warn(
          "RecoveryManager",
          `${operationName} failed on attempt ${attempt}/${maxRetries}: ${error.message}`
        );

        if (attempt < maxRetries) {
          await this._wait(Math.min(1000 * Math.pow(2, attempt - 1), 5000));
        }
      }
    }
    return false;
  }

  /**
   * Clean up recovery state for a participant
   * @param {string} participantId - Participant ID
   */
  cleanupParticipant(participantId) {
    delete this.reconnectionAttempts[participantId];
    delete this.recoveryInProgress[participantId];
    delete this.lastRecoveryAttempts[participantId];

    this.logger.debug(
      "RecoveryManager",
      `Cleaned up recovery state for ${participantId}`
    );
  }

  /**
   * Clean up all recovery state
   */
  cleanup() {
    this.reconnectionAttempts = {};
    this.recoveryInProgress = {};
    this.lastRecoveryAttempts = {};

    this.logger.info("RecoveryManager", "Recovery manager cleanup completed");
  }

  /**
   * Destroy recovery manager
   */
  destroy() {
    this.cleanup();
    this.logger.info("RecoveryManager", "Recovery manager destroyed");
  }
}

export default RecoveryManager;
