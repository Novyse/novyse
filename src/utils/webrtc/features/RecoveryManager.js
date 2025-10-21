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
   * @param {string} deviceUUID - Participant ID to recover
   * @returns {Promise<boolean>} True if recovery was successful
   */
  async attemptConnectionRecovery(deviceUUID) {
    if (!deviceUUID) {
      this.logger.warn(
        "RecoveryManager",
        "Cannot recover empty participant ID"
      );
      return false;
    }

    // Check if recovery is already in progress
    if (this.recoveryInProgress[deviceUUID]) {
      this.logger.info(
        "RecoveryManager",
        `Recovery already in progress for ${deviceUUID}`
      );
      return false;
    }

    // Check retry limits
    const currentAttempts = this.reconnectionAttempts[deviceUUID] || 0;
    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      this.logger.error(
        "RecoveryManager",
        `Max recovery attempts (${this.MAX_RECONNECTION_ATTEMPTS}) reached for ${deviceUUID}`
      );
      return false;
    }

    this.recoveryInProgress[deviceUUID] = true;
    this.reconnectionAttempts[deviceUUID] = currentAttempts + 1;
    this.lastRecoveryAttempts[deviceUUID] = Date.now();

    this.logger.warn(
      "RecoveryManager",
      `Starting recovery attempt ${this.reconnectionAttempts[deviceUUID]}/${this.MAX_RECONNECTION_ATTEMPTS} for ${deviceUUID}`
    );

    try {
      const success = await this._performConnectionRecovery(deviceUUID);

      if (success) {
        this.reconnectionAttempts[deviceUUID] = 0; // Reset on success
        this.logger.info(
          "RecoveryManager",
          `Recovery successful for ${deviceUUID}`
        );
      } else {
        this.logger.warn(
          "RecoveryManager",
          `Recovery attempt failed for ${deviceUUID}`
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Recovery error for ${deviceUUID}: ${error.message}`
      );
      return false;
    } finally {
      this.recoveryInProgress[deviceUUID] = false;
    }
  }

  /**
   * Force manual reconnection for a participant
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} True if reconnection was initiated
   */
  async forceReconnection(deviceUUID) {
    if (!deviceUUID) return false;

    this.logger.info(
      "RecoveryManager",
      `Forcing manual reconnection for ${deviceUUID}`
    );

    // Reset attempt counter for manual retry
    this.reconnectionAttempts[deviceUUID] = 0;

    return await this.attemptConnectionRecovery(deviceUUID);
  }

  /**
   * Reset reconnection attempts for a participant
   * @param {string} deviceUUID - Participant ID
   */
  resetReconnectionAttempts(deviceUUID) {
    if (this.reconnectionAttempts[deviceUUID]) {
      delete this.reconnectionAttempts[deviceUUID];
      this.logger.debug(
        "RecoveryManager",
        `Reset reconnection attempts for ${deviceUUID}`
      );
    }
  }

  /**
   * Get recovery statistics for a participant
   * @param {string} deviceUUID - Participant ID
   * @returns {Object} Recovery statistics
   */
  getRecoveryStatistics(deviceUUID) {
    return {
      deviceUUID,
      reconnectionAttempts: this.reconnectionAttempts[deviceUUID] || 0,
      maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
      recoveryInProgress: !!this.recoveryInProgress[deviceUUID],
      lastRecoveryTime: this.lastRecoveryAttempts[deviceUUID] || null,
      canAttemptRecovery:
        (this.reconnectionAttempts[deviceUUID] || 0) <
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
    ].forEach((deviceUUID) => {
      stats[deviceUUID] = this.getRecoveryStatistics(deviceUUID);
    });

    return stats;
  }

  /**
   * Perform the actual connection recovery
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} Recovery success
   * @private
   */
  async _performConnectionRecovery(deviceUUID) {
    const currentAttempt = this.reconnectionAttempts[deviceUUID];
    const pc = this.globalState.getPeerConnection(deviceUUID);

    if (!pc) {
      throw new Error(`No peer connection found for ${deviceUUID}`);
    }

    // Add exponential backoff delay
    const delay =
      this.RECONNECTION_BASE_DELAY * Math.pow(2, currentAttempt - 1);
    if (delay > 0) {
      this.logger.debug(
        "RecoveryManager",
        `Waiting ${delay}ms before recovery attempt for ${deviceUUID}`
      );
      await this._wait(delay);
    }

    // Try different recovery strategies based on attempt number
    try {
      if (currentAttempt === 1) {
        // Strategy 1: ICE restart (lightest approach)
        return await this._performICERestart(deviceUUID);
      } else if (currentAttempt === 2) {
        // Strategy 2: Full renegotiation
        return await this._performRenegotiation(deviceUUID);
      } else {
        // Strategy 3: Full reconnection (most aggressive)
        return await this._performFullReconnection(deviceUUID);
      }
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Recovery strategy failed for ${deviceUUID}: ${error.message}`
      );
      return false;
    }
  }
  /**
   * Perform ICE restart recovery
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performICERestart(deviceUUID) {
    this.logger.info(
      "RecoveryManager",
      `Attempting ICE restart for ${deviceUUID}`
    );

    const pc = this.globalState.getPeerConnection(deviceUUID);
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
          deviceUUID,
          offer
        );

        if (!success) {
          throw new Error("Failed to send ICE restart offer after retries");
        }

        // Wait for connection stabilization
        const stabilized = await this._waitForConnectionStabilization(
          deviceUUID
        );

        if (stabilized) {
          this.logger.info(
            "RecoveryManager",
            `ICE restart successful for ${deviceUUID}`
          );
        }

        return stabilized;
      } else {
        // Fallback to direct WebSocket if no signaling manager
        this.logger.warn(
          "RecoveryManager",
          `No signaling manager available, using direct WebSocket for ${deviceUUID}`
        );

        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);

        const SocketIO = await import(
          "../../backend-services/socket-io.js"
        );
        const success = await this._sendWithRetry(
          () =>
            SocketIO.default.send().RTCOffer({
              offer: offer.toJSON
                ? offer.toJSON()
                : { sdp: offer.sdp, type: offer.type },
              toDeviceUUID: deviceUUID,
              deviceUUID: this.globalState.getDeviceUUID(),
              commUUID: this.globalState.getCommUUID(),
            }),
          `ICE restart offer to ${deviceUUID}`,
          3
        );

        if (!success) {
          throw new Error("Failed to send ICE restart offer via WebSocket");
        }

        return await this._waitForConnectionStabilization(deviceUUID);
      }
    } catch (error) {
      this.logger.warn(
        "RecoveryManager",
        `ICE restart failed for ${deviceUUID}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Perform full renegotiation recovery
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performRenegotiation(deviceUUID) {
    this.logger.info(
      "RecoveryManager",
      `Attempting renegotiation for ${deviceUUID}`
    );

    try {
      // Use signaling manager for safe renegotiation
      const signalingManager = this.globalState.getSignalingManager();
      if (signalingManager) {
        const offer = await signalingManager.createOffer(deviceUUID);
        if (offer) {
          const success = await this._waitForConnectionStabilization(
            deviceUUID
          );

          if (success) {
            this.logger.info(
              "RecoveryManager",
              `Renegotiation successful for ${deviceUUID}`
            );
          }

          return success;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn(
        "RecoveryManager",
        `Renegotiation failed for ${deviceUUID}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Perform full reconnection recovery
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _performFullReconnection(deviceUUID) {
    this.logger.info(
      "RecoveryManager",
      `Attempting full reconnection for ${deviceUUID}`
    );

    try {
      // Get peer connection manager
      const peerConnectionManager = this.globalState.getPeerConnectionManager();
      if (!peerConnectionManager) {
        throw new Error("No peer connection manager available");
      }

      // Close existing connection
      const existingPc = this.globalState.getPeerConnection(deviceUUID);
      if (existingPc) {
        existingPc.close();
      }

      // Remove from global state
      this.globalState.removePeerConnection(deviceUUID);

      // Create new connection
      const userData = this.globalState.getUserData(deviceUUID);
      if (userData) {
        const newPc = peerConnectionManager.createPeerConnection({
          deviceUUID: deviceUUID,
          handle: userData.handle,
        });

        if (newPc) {
          // Wait for connection stabilization
          const success = await this._waitForConnectionStabilization(
            deviceUUID
          );

          if (success) {
            this.logger.info(
              "RecoveryManager",
              `Full reconnection successful for ${deviceUUID}`
            );
          }

          return success;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        "RecoveryManager",
        `Full reconnection failed for ${deviceUUID}: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Wait for connection to stabilize
   * @param {string} deviceUUID - Participant ID
   * @returns {Promise<boolean>} True if connection stabilized
   * @private
   */
  async _waitForConnectionStabilization(deviceUUID) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
    if (!pc) return false;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 500; // Check every 500ms

      const checkConnection = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > this.STABILIZATION_TIMEOUT) {
          this.logger.warn(
            "RecoveryManager",
            `Connection stabilization timeout for ${deviceUUID}`
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
            `Connection stabilized for ${deviceUUID} (${connectionState}/${iceConnectionState})`
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
            `Connection failed during stabilization for ${deviceUUID} (${connectionState}/${iceConnectionState})`
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
   * @param {string} deviceUUID - Target participant ID
   * @param {RTCSessionDescription} offer - Offer to send
   * @returns {Promise<boolean>} True if sent successfully
   * @private
   */
  async _sendOfferWithRetry(signalingManager, deviceUUID, offer) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Use signaling manager's retry mechanism
        const SocketIO = await import(
          "../../backend-services/socket-io.js"
        );

        if (!SocketIO.default.isOpen()) {
          this.logger.warn(
            "RecoveryManager",
            `WebSocket not connected for offer to ${deviceUUID}, attempt ${attempt}/${maxRetries}`
          );

          if (attempt < maxRetries) {
            await this._wait(Math.min(1000 * attempt, 5000));
            continue;
          }
          return false;
        }

        const sender = SocketIO.default.send();
        if (!sender) {
          throw new Error("Socket not connected, cannot send offer");
        }

        await sender.RTCOffer({
          offer: offer.toJSON
            ? offer.toJSON()
            : { sdp: offer.sdp, type: offer.type },
          toDeviceUUID: deviceUUID,
          deviceUUID: this.globalState.getDeviceUUID(),
          commUUID: this.globalState.getCommUUID(),
        });

        this.logger.debug(
          "RecoveryManager",
          `Offer sent successfully to ${deviceUUID} on attempt ${attempt}`
        );
        return true;
      } catch (error) {
        this.logger.warn(
          "RecoveryManager",
          `Offer send failed to ${deviceUUID} on attempt ${attempt}/${maxRetries}: ${error.message}`
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
        const SocketIO = await import(
          "../../backend-services/socket-io.js"
        );

        if (!SocketIO.default.isOpen()) {
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

        const sender = SocketIO.default.send();
        if (!sender) {
          throw new Error("Socket not connected, cannot perform send operation");
        }

        const result = await sendFunction(sender); // Pass sender to sendFunction if needed
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
   * @param {string} deviceUUID - Participant ID
   */
  cleanupParticipant(deviceUUID) {
    delete this.reconnectionAttempts[deviceUUID];
    delete this.recoveryInProgress[deviceUUID];
    delete this.lastRecoveryAttempts[deviceUUID];

    this.logger.debug(
      "RecoveryManager",
      `Cleaned up recovery state for ${deviceUUID}`
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
