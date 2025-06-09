import WebRTCLogger from "../logging/WebRTCLogger.js";
import { LogLevels } from "../logging/LogLevels.js";
import { GlobalState } from "../core/GlobalState.js";
import { WEBRTC_CONSTANTS } from "../config/constants.js";

/**
 * HealthChecker - Monitors WebRTC connection health and triggers recovery
 * Provides continuous health monitoring, statistics collection, and automatic recovery
 */
export class HealthChecker {
  constructor() {
    this.logger = WebRTCLogger;
    this.globalState = GlobalState;

    // Health check intervals per connection
    this.healthCheckIntervals = {};

    // Health check configuration
    this.HEALTH_CHECK_INTERVAL = WEBRTC_CONSTANTS.HEALTH_CHECK_INTERVAL || 5000; // 5 seconds
    this.CONNECTION_TIMEOUT = WEBRTC_CONSTANTS.CONNECTION_TIMEOUT || 30000; // 30 seconds
    this.MAX_FAILED_CHECKS = 3; // Max consecutive failed checks before triggering recovery

    // Connection health states
    this.connectionHealthStates = {};
    this.consecutiveFailures = {};
    this.lastKnownGoodStates = {};

    // Statistics collection
    this.healthStatistics = {};

    this.logger.info("Health checker initialized");
  }

  /**
   * Start health monitoring for a connection
   * @param {string} participantId - Participant ID to monitor
   */
  startHealthMonitoring(participantId) {
    if (!participantId) {
      this.logger.info("Cannot start monitoring for empty participant ID");
      return;
    }

    // Stop existing monitoring if any
    this.stopHealthMonitoring(participantId);

    // Initialize health state
    this.connectionHealthStates[participantId] = {
      isHealthy: true,
      lastCheckTime: Date.now(),
      checkCount: 0,
    };
    this.consecutiveFailures[participantId] = 0;
    this.healthStatistics[participantId] = {
      totalChecks: 0,
      failedChecks: 0,
      recoveryAttempts: 0,
      lastRecoveryTime: null,
    };

    // Start periodic health checks
    this.healthCheckIntervals[participantId] = setInterval(() => {
      this._performHealthCheck(participantId);
    }, this.HEALTH_CHECK_INTERVAL);

    this.logger.debug(`Started health monitoring for ${participantId}`);
  }

  /**
   * Stop health monitoring for a connection
   * @param {string} participantId - Participant ID to stop monitoring
   */
  stopHealthMonitoring(participantId) {
    if (this.healthCheckIntervals[participantId]) {
      clearInterval(this.healthCheckIntervals[participantId]);
      delete this.healthCheckIntervals[participantId];
    }

    // Clean up health state but keep statistics
    delete this.connectionHealthStates[participantId];
    delete this.consecutiveFailures[participantId];
    delete this.lastKnownGoodStates[participantId];

    this.logger.debug(`Stopped health monitoring for ${participantId}`);
  }

  /**
   * Get health status for a connection
   * @param {string} participantId - Participant ID
   * @returns {Object|null} Health status object
   */
  getHealthStatus(participantId) {
    const healthState = this.connectionHealthStates[participantId];
    const pc = this.globalState.getPeerConnection(participantId);

    if (!pc || !healthState) {
      return null;
    }

    return {
      participantId,
      isHealthy: healthState.isHealthy,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState,
      lastCheckTime: healthState.lastCheckTime,
      checkCount: healthState.checkCount,
      consecutiveFailures: this.consecutiveFailures[participantId] || 0,
      statistics: this.healthStatistics[participantId] || {},
    };
  }

  /**
   * Get health status for all monitored connections
   * @returns {Object} Health status for all connections
   */
  getAllHealthStatuses() {
    const statuses = {};

    Object.keys(this.connectionHealthStates).forEach((participantId) => {
      statuses[participantId] = this.getHealthStatus(participantId);
    });

    return statuses;
  }

  /**
   * Check if a connection is considered healthy
   * @param {string} participantId - Participant ID
   * @returns {boolean} True if connection is healthy
   */
  isConnectionHealthy(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) return false;

    const connectionState = pc.connectionState;
    const iceConnectionState = pc.iceConnectionState;

    // Consider connection healthy if it's connected or connecting
    const isConnectionHealthy =
      connectionState === "connected" || connectionState === "connecting";

    const isIceHealthy =
      iceConnectionState === "connected" ||
      iceConnectionState === "completed" ||
      iceConnectionState === "checking";

    return isConnectionHealthy && isIceHealthy;
  }

  /**
   * Check if a connection has failed
   * @param {string} participantId - Participant ID
   * @returns {boolean} True if connection has failed
   */
  isConnectionFailed(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) return true;

    const connectionState = pc.connectionState;
    const iceConnectionState = pc.iceConnectionState;

    return (
      connectionState === "failed" ||
      connectionState === "closed" ||
      iceConnectionState === "failed" ||
      iceConnectionState === "disconnected"
    );
  }

  /**
   * Force a health check for a specific connection
   * @param {string} participantId - Participant ID
   * @returns {Object} Health check result
   */
  async forceHealthCheck(participantId) {
    return await this._performHealthCheck(participantId);
  }

  /**
   * Get comprehensive health report
   * @returns {Object} Detailed health report
   */
  getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalConnections: Object.keys(this.connectionHealthStates).length,
      healthyConnections: 0,
      unhealthyConnections: 0,
      monitoredConnections: [],
      overallHealth: "unknown",
    };

    Object.keys(this.connectionHealthStates).forEach((participantId) => {
      const status = this.getHealthStatus(participantId);
      if (status) {
        report.monitoredConnections.push(status);
        if (status.isHealthy) {
          report.healthyConnections++;
        } else {
          report.unhealthyConnections++;
        }
      }
    });

    // Determine overall health
    if (report.totalConnections === 0) {
      report.overallHealth = "no_connections";
    } else if (report.unhealthyConnections === 0) {
      report.overallHealth = "healthy";
    } else if (report.healthyConnections === 0) {
      report.overallHealth = "all_unhealthy";
    } else {
      report.overallHealth = "partially_healthy";
    }

    return report;
  }

  /**
   * Perform health check for a connection
   * @param {string} participantId - Participant ID
   * @private
   */
  async _performHealthCheck(participantId) {
    const healthState = this.connectionHealthStates[participantId];
    const statistics = this.healthStatistics[participantId];

    if (!healthState || !statistics) {
      return null;
    }

    try {
      const pc = this.globalState.getPeerConnection(participantId);
      if (!pc) {
        this._handleHealthCheckFailure(
          participantId,
          "No peer connection found"
        );
        return null;
      }

      // Update check count and time
      healthState.checkCount++;
      healthState.lastCheckTime = Date.now();
      statistics.totalChecks++;

      // Perform actual health check
      const isHealthy = this.isConnectionHealthy(participantId);
      const isFailed = this.isConnectionFailed(participantId);

      if (isFailed) {
        this._handleHealthCheckFailure(participantId, "Connection failed");
        return { participantId, healthy: false, reason: "connection_failed" };
      }

      if (!isHealthy) {
        this._handleHealthCheckFailure(participantId, "Connection unhealthy");
        return {
          participantId,
          healthy: false,
          reason: "connection_unhealthy",
        };
      }

      // Connection is healthy
      this._handleHealthCheckSuccess(participantId);

      return { participantId, healthy: true };
    } catch (error) {
      this._handleHealthCheckFailure(
        participantId,
        `Health check error: ${error.message}`
      );
      return {
        participantId,
        healthy: false,
        reason: "check_error",
        error: error.message,
      };
    }
  }

  /**
   * Handle successful health check
   * @param {string} participantId - Participant ID
   * @private
   */
  _handleHealthCheckSuccess(participantId) {
    const healthState = this.connectionHealthStates[participantId];
    const pc = this.globalState.getPeerConnection(participantId);

    if (healthState) {
      healthState.isHealthy = true;
    }

    // Reset consecutive failures
    this.consecutiveFailures[participantId] = 0;

    // Update last known good state
    if (pc) {
      this.lastKnownGoodStates[participantId] = {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle failed health check
   * @param {string} participantId - Participant ID
   * @param {string} reason - Failure reason
   * @private
   */
  _handleHealthCheckFailure(participantId, reason) {
    const healthState = this.connectionHealthStates[participantId];
    const statistics = this.healthStatistics[participantId];

    if (healthState) {
      healthState.isHealthy = false;
    }

    if (statistics) {
      statistics.failedChecks++;
    }

    // Increment consecutive failures
    this.consecutiveFailures[participantId] =
      (this.consecutiveFailures[participantId] || 0) + 1;

    this.logger.info(
      `Health check failed for ${participantId}: ${reason} (consecutive failures: ${this.consecutiveFailures[participantId]})`
    );

    // Trigger recovery if too many consecutive failures
    if (this.consecutiveFailures[participantId] >= this.MAX_FAILED_CHECKS) {
      this._triggerRecovery(participantId);
    }
  }

  /**
   * Trigger connection recovery
   * @param {string} participantId - Participant ID
   * @private
   */
  async _triggerRecovery(participantId) {
    const statistics = this.healthStatistics[participantId];

    if (statistics) {
      statistics.recoveryAttempts++;
      statistics.lastRecoveryTime = Date.now();
    }

    this.logger.info(
      `Triggering recovery for ${participantId} after ${this.consecutiveFailures[participantId]} consecutive failures`
    );

    try {
      // Get recovery manager from global state or components
      const recoveryManager = this.globalState.getRecoveryManager();
      if (recoveryManager) {
        await recoveryManager.attemptConnectionRecovery(participantId);
      } else {
        this.logger.info("No recovery manager available");
      }
    } catch (error) {
      this.logger.info(
        `Recovery attempt failed for ${participantId}: ${error.message}`
      );
    }
  }

  /**
   * Clean up all health monitoring
   */
  cleanup() {
    // Stop all health check intervals
    Object.keys(this.healthCheckIntervals).forEach((participantId) => {
      this.stopHealthMonitoring(participantId);
    });

    // Clear all state
    this.connectionHealthStates = {};
    this.consecutiveFailures = {};
    this.lastKnownGoodStates = {};
    this.healthStatistics = {};

    this.logger.info("Health checker cleanup completed");
  }

  /**
   * Destroy health checker
   */
  destroy() {
    this.cleanup();
    this.logger.info("Health checker destroyed");
  }
}

export default HealthChecker;
