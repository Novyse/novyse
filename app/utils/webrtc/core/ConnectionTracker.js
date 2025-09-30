import { LOG_LEVELS } from "../logging/LogLevels.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";

/**
 * Tracks connection states and provides monitoring functionality
 */
export class ConnectionTracker {
  constructor(globalState, logger) {
    this.globalState = globalState;
    this.logger = logger;

    this.logger.info("ConnectionTracker", "ConnectionTracker initialized");
  }

  /**
   * Initialize connection tracking for a participant
   * @param {string} deviceUUID - The participant ID
   */ initializeTracking(deviceUUID) {
    this.logger.debug(
      "ConnectionTracker",
      `Initializing tracking for ${deviceUUID}`
    );

    this.globalState.connectionStates[deviceUUID] = "connecting";
    this.globalState.connectionTimestamps[deviceUUID] = {
      initialized: Date.now(),
      lastSignalingTransition: null,
    };
    this.globalState.reconnectionAttempts[deviceUUID] = 0;
    this.globalState.lastKnownGoodStates[deviceUUID] = null;
    this.globalState.iceCandidateQueues[deviceUUID] = [];

    this.reportConnectionEvent(deviceUUID, "tracking_initialized");
  }

  /**
   * Report a connection event for logging and debugging
   * @param {string} deviceUUID - The participant ID
   * @param {string} event - The event name
   * @param {*} data - Optional event data
   */
  reportConnectionEvent(deviceUUID, event, data = null) {
    const timestamp = new Date().toISOString();

    this.logger.debug(
      "ConnectionTracker",
      `[${timestamp}] ${deviceUUID}: ${event}`,
      data || ""
    );

    // Update connection state based on event
    this._updateConnectionStateFromEvent(deviceUUID, event);
  }

  /**
   * Log detailed connection debug information
   * @param {string} deviceUUID - The participant ID
   * @param {string} context - The context of the debug log
   */
  logConnectionDebugInfo(deviceUUID, context) {
    const pc = this.globalState.peerConnections[deviceUUID];
    if (!pc) return;

    const debugInfo = {
      context,
      iceConnectionState: pc.iceConnectionState,
      connectionState: pc.connectionState,
      signalingState: pc.signalingState,
      iceGatheringState: pc.iceGatheringState,
      reconnectionAttempts:
        this.globalState.reconnectionAttempts[deviceUUID] || 0,
      lastGoodConnection: this.globalState.lastKnownGoodStates[deviceUUID],
      queuedCandidates:
        this.globalState.iceCandidateQueues[deviceUUID]?.length || 0,
    };

    this.logger.debug(
      "ConnectionTracker",
      `${deviceUUID} debug:`,
      debugInfo
    );
  }

  /**
   * Get connection statistics for a specific participant or all participants
   * @param {string|null} deviceUUID - The participant ID (null for all)
   * @returns {Object} Connection statistics
   */
  getConnectionStats(deviceUUID = null) {
    if (deviceUUID) {
      return this._getStatsForParticipant(deviceUUID);
    } else {
      return this._getAllConnectionStats();
    }
  }

  /**
   * Print a detailed connection report for debugging
   */
  printConnectionReport() {
    this.logger.info(
      "ConnectionTracker",
      "\n🔍 ===== WEBRTC CONNECTION REPORT ====="
    );

    const stats = this.getConnectionStats();

    this.logger.info("ConnectionTracker", `👤 My ID: ${stats.deviceUUID}`);
    this.logger.info("ConnectionTracker", `💬 Chat ID: ${stats.commUUID}`);
    this.logger.info(
      "ConnectionTracker",
      `🎤 Local Stream: ${
        stats.hasLocalStream ? `✅ (${stats.localStreamTracks} tracks)` : "❌"
      }`
    );
    this.logger.info(
      "ConnectionTracker",
      `🔗 Total Connections: ${stats.totalConnections}`
    );
    this.logger.info(
      "ConnectionTracker",
      `⚙️ Health Check Interval: ${stats.healthCheckInterval}ms`
    );
    this.logger.info(
      "ConnectionTracker",
      `🔄 Max Reconnection Attempts: ${stats.maxReconnectionAttempts}`
    );

    if (stats.totalConnections === 0) {
      this.logger.info("ConnectionTracker", "📭 No active connections");
    } else {
      this.logger.info("ConnectionTracker", "\n📊 CONNECTION DETAILS:");
      Object.entries(stats.connections).forEach(([id, conn]) => {
        this.logger.info(
          "ConnectionTracker",
          `\n👥 ${conn.userHandle} (${id}):`
        );
        this.logger.info(
          "ConnectionTracker",
          `   🔗 Connection: ${conn.connectionState} | ICE: ${conn.iceConnectionState}`
        );
        this.logger.info(
          "ConnectionTracker",
          `   📡 Signaling: ${conn.signalingState} | ICE Gathering: ${conn.iceGatheringState}`
        );
        this.logger.info(
          "ConnectionTracker",
          `   🔄 Reconnection: ${conn.reconnectionAttempts}/${conn.maxAttempts}`
        );
        this.logger.info(
          "ConnectionTracker",
          `   ⏰ Age: ${conn.connectionAge}s | Last Good: ${
            conn.lastGoodConnection
              ? conn.lastGoodConnection + "s ago"
              : "Never"
          }`
        );
        this.logger.info(
          "ConnectionTracker",
          `   📺 Remote Stream: ${
            conn.hasRemoteStream
              ? `✅ (${conn.remoteStreamTracks} tracks)`
              : "❌"
          }`
        );
        this.logger.info(
          "ConnectionTracker",
          `   📋 Queued Candidates: ${conn.queuedCandidates} | Negotiating: ${
            conn.negotiationInProgress ? "✅" : "❌"
          }`
        );
      });
    }

    this.logger.info("ConnectionTracker", "===== END REPORT =====\n");
  }

  /**
   * Clear tracking data for a participant
   * @param {string} deviceUUID - The participant ID
   */
  clearTracking(deviceUUID) {
    this.logger.debug(
      "ConnectionTracker",
      `Clearing tracking for ${deviceUUID}`
    );

    delete this.globalState.connectionStates[deviceUUID];
    delete this.globalState.connectionTimestamps[deviceUUID];
    delete this.globalState.reconnectionAttempts[deviceUUID];
    delete this.globalState.lastKnownGoodStates[deviceUUID];
    delete this.globalState.iceCandidateQueues[deviceUUID];
    delete this.globalState.negotiationInProgress[deviceUUID];
  }

  /**
   * Check if a connection is healthy
   * @param {string} deviceUUID - The participant ID
   * @returns {Object} Health status information
   */
  checkConnectionHealth(deviceUUID) {
    const pc = this.globalState.peerConnections[deviceUUID];
    if (!pc) {
      return { healthy: false, reason: "NO_CONNECTION" };
    }
    const currentTime = Date.now();
    const timestampObj = this.globalState.connectionTimestamps[deviceUUID];
    const initTimestamp = timestampObj
      ? typeof timestampObj === "number"
        ? timestampObj
        : timestampObj.initialized
      : currentTime;
    const connectionAge = currentTime - initTimestamp;
    const timeSinceLastGood = this.globalState.lastKnownGoodStates[
      deviceUUID
    ]
      ? currentTime - this.globalState.lastKnownGoodStates[deviceUUID]
      : connectionAge;

    // Check for unhealthy conditions
    const isUnhealthy =
      pc.iceConnectionState === "disconnected" ||
      pc.iceConnectionState === "failed" ||
      pc.connectionState === "failed" ||
      (pc.iceConnectionState === "checking" && connectionAge > 30000) ||
      (timeSinceLastGood > 45000 &&
        pc.iceConnectionState !== "connected" &&
        pc.iceConnectionState !== "completed");

    if (isUnhealthy) {
      const reason =
        pc.iceConnectionState === "failed"
          ? "ICE_FAILED"
          : pc.connectionState === "failed"
          ? "CONNECTION_FAILED"
          : pc.iceConnectionState === "disconnected"
          ? "DISCONNECTED"
          : connectionAge > 30000
          ? "STUCK_IN_CHECKING"
          : "NO_GOOD_CONNECTION";

      return {
        healthy: false,
        reason,
        connectionAge: Math.round(connectionAge / 1000),
        timeSinceLastGood: Math.round(timeSinceLastGood / 1000),
      };
    }

    return { healthy: true };
  }

  /**
   * Update last known good state for a connection
   * @param {string} deviceUUID - The participant ID
   */
  updateLastKnownGoodState(deviceUUID) {
    this.globalState.lastKnownGoodStates[deviceUUID] = Date.now();
    this.logger.verbose(
      "ConnectionTracker",
      `Updated last good state for ${deviceUUID}`
    );
  }

  // ===== PRIVATE METHODS =====

  /**
   * Update connection state based on event
   * @param {string} deviceUUID - The participant ID
   * @param {string} event - The event name
   */
  _updateConnectionStateFromEvent(deviceUUID, event) {
    if (event.includes("connected") || event.includes("completed")) {
      this.globalState.connectionStates[deviceUUID] = "connected";
      this.globalState.lastKnownGoodStates[deviceUUID] = Date.now();
      this.globalState.reconnectionAttempts[deviceUUID] = 0; // Reset on success
    } else if (event.includes("failed") || event.includes("disconnected")) {
      this.globalState.connectionStates[deviceUUID] = "failed";
    } else if (event.includes("checking")) {
      this.globalState.connectionStates[deviceUUID] = "checking";
    }
  }

  /**
   * Get connection statistics for a specific participant
   * @param {string} deviceUUID - The participant ID
   * @returns {Object} Connection statistics
   */
  _getStatsForParticipant(deviceUUID) {
    const pc = this.globalState.peerConnections[deviceUUID];
    const userData = this.globalState.userData[deviceUUID];
    const currentTime = Date.now();

    return {
      deviceUUID,
      userHandle: userData?.handle || "Unknown",
      connectionExists: !!pc,
      connectionState: pc?.connectionState || "N/A",
      iceConnectionState: pc?.iceConnectionState || "N/A",
      signalingState: pc?.signalingState || "N/A",
      iceGatheringState: pc?.iceGatheringState || "N/A",
      reconnectionAttempts:
        this.globalState.reconnectionAttempts[deviceUUID] || 0,
      maxAttempts: WEBRTC_CONSTANTS.MAX_RECONNECTION_ATTEMPTS,
      connectionAge: this.globalState.connectionTimestamps[deviceUUID]
        ? (() => {
            const timestampObj =
              this.globalState.connectionTimestamps[deviceUUID];
            const initTimestamp =
              typeof timestampObj === "number"
                ? timestampObj
                : timestampObj.initialized;
            return Math.round((currentTime - initTimestamp) / 1000);
          })()
        : 0,
      lastGoodConnection: this.globalState.lastKnownGoodStates[deviceUUID]
        ? Math.round(
            (currentTime -
              this.globalState.lastKnownGoodStates[deviceUUID]) /
              1000
          )
        : null,
      queuedCandidates:
        this.globalState.iceCandidateQueues[deviceUUID]?.length || 0,
      negotiationInProgress:
        this.globalState.negotiationInProgress[deviceUUID] || false,
      hasRemoteStream: !!this.globalState.remoteStreams[deviceUUID],
      remoteStreamTracks:
        this.globalState.remoteStreams[deviceUUID]?.getTracks()?.length || 0,
    };
  }

  /**
   * Get connection statistics for all participants
   * @returns {Object} All connection statistics
   */
  _getAllConnectionStats() {
    const allStats = {};
    Object.keys(this.globalState.peerConnections).forEach((id) => {
      allStats[id] = this._getStatsForParticipant(id);
    });

    return {
      totalConnections: Object.keys(this.globalState.peerConnections).length,
      deviceUUID: this.globalState.deviceUUID,
      commUUID: this.globalState.commUUID,
      hasLocalStream: !!this.globalState.localStream,
      localStreamTracks: this.globalState.localStream?.getTracks()?.length || 0,
      connections: allStats,
      healthCheckInterval: WEBRTC_CONSTANTS.HEALTH_CHECK_INTERVAL,
      maxReconnectionAttempts: WEBRTC_CONSTANTS.MAX_RECONNECTION_ATTEMPTS,
      reconnectionBaseDelay: WEBRTC_CONSTANTS.RECONNECTION_BASE_DELAY,
    };
  }
}

// Default export for Expo Router compatibility
export default ConnectionTracker;
