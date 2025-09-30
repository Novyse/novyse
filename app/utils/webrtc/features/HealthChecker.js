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
   * @param {string} deviceUUID - Participant ID to monitor
   */
  startHealthMonitoring(deviceUUID) {
    if (!deviceUUID) {
      this.logger.info("Cannot start monitoring for empty participant ID");
      return;
    }

    // Stop existing monitoring if any
    this.stopHealthMonitoring(deviceUUID);

    // Initialize health state
    this.connectionHealthStates[deviceUUID] = {
      isHealthy: true,
      lastCheckTime: Date.now(),
      checkCount: 0,
    };
    this.consecutiveFailures[deviceUUID] = 0;
    this.healthStatistics[deviceUUID] = {
      totalChecks: 0,
      failedChecks: 0,
      recoveryAttempts: 0,
      lastRecoveryTime: null,
    };

    // Start periodic health checks
    this.healthCheckIntervals[deviceUUID] = setInterval(() => {
      this._performHealthCheck(deviceUUID);
    }, this.HEALTH_CHECK_INTERVAL);

    this.logger.debug(`Started health monitoring for ${deviceUUID}`);
  }

  /**
   * Stop health monitoring for a connection
   * @param {string} deviceUUID - Participant ID to stop monitoring
   */
  stopHealthMonitoring(deviceUUID) {
    if (this.healthCheckIntervals[deviceUUID]) {
      clearInterval(this.healthCheckIntervals[deviceUUID]);
      delete this.healthCheckIntervals[deviceUUID];
    }

    // Clean up health state but keep statistics
    delete this.connectionHealthStates[deviceUUID];
    delete this.consecutiveFailures[deviceUUID];
    delete this.lastKnownGoodStates[deviceUUID];

    this.logger.debug(`Stopped health monitoring for ${deviceUUID}`);
  }

  /**
   * Get health status for a connection
   * @param {string} deviceUUID - Participant ID
   * @returns {Object|null} Health status object
   */
  getHealthStatus(deviceUUID) {
    const healthState = this.connectionHealthStates[deviceUUID];
    const pc = this.globalState.getPeerConnection(deviceUUID);

    if (!pc || !healthState) {
      return null;
    }

    return {
      deviceUUID,
      isHealthy: healthState.isHealthy,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState,
      lastCheckTime: healthState.lastCheckTime,
      checkCount: healthState.checkCount,
      consecutiveFailures: this.consecutiveFailures[deviceUUID] || 0,
      statistics: this.healthStatistics[deviceUUID] || {},
    };
  }

  /**
   * Get health status for all monitored connections
   * @returns {Object} Health status for all connections
   */
  getAllHealthStatuses() {
    const statuses = {};

    Object.keys(this.connectionHealthStates).forEach((deviceUUID) => {
      statuses[deviceUUID] = this.getHealthStatus(deviceUUID);
    });

    return statuses;
  }

  /**
   * Check if a connection is considered healthy
   * @param {string} deviceUUID - Participant ID
   * @returns {boolean} True if connection is healthy
   */
  isConnectionHealthy(deviceUUID) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
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
   * @param {string} deviceUUID - Participant ID
   * @returns {boolean} True if connection has failed
   */
  isConnectionFailed(deviceUUID) {
    const pc = this.globalState.getPeerConnection(deviceUUID);
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
   * @param {string} deviceUUID - Participant ID
   * @returns {Object} Health check result
   */
  async forceHealthCheck(deviceUUID) {
    return await this._performHealthCheck(deviceUUID);
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

    Object.keys(this.connectionHealthStates).forEach((deviceUUID) => {
      const status = this.getHealthStatus(deviceUUID);
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
   * @param {string} deviceUUID - Participant ID
   * @private
   */
  async _performHealthCheck(deviceUUID) {
    const healthState = this.connectionHealthStates[deviceUUID];
    const statistics = this.healthStatistics[deviceUUID];

    if (!healthState || !statistics) {
      return null;
    }

    try {
      const pc = this.globalState.getPeerConnection(deviceUUID);
      if (!pc) {
        this._handleHealthCheckFailure(
          deviceUUID,
          "No peer connection found"
        );
        return null;
      }

      // Update check count and time
      healthState.checkCount++;
      healthState.lastCheckTime = Date.now();
      statistics.totalChecks++;

      // Perform actual health check
      const isHealthy = this.isConnectionHealthy(deviceUUID);
      const isFailed = this.isConnectionFailed(deviceUUID);

      if (isFailed) {
        this._handleHealthCheckFailure(deviceUUID, "Connection failed");
        return { deviceUUID, healthy: false, reason: "connection_failed" };
      }

      if (!isHealthy) {
        this._handleHealthCheckFailure(deviceUUID, "Connection unhealthy");
        return {
          deviceUUID,
          healthy: false,
          reason: "connection_unhealthy",
        };
      }

      // Connection is healthy
      this._handleHealthCheckSuccess(deviceUUID);

      return { deviceUUID, healthy: true };
    } catch (error) {
      this._handleHealthCheckFailure(
        deviceUUID,
        `Health check error: ${error.message}`
      );
      return {
        deviceUUID,
        healthy: false,
        reason: "check_error",
        error: error.message,
      };
    }
  }

  /**
   * Handle successful health check
   * @param {string} deviceUUID - Participant ID
   * @private
   */
  _handleHealthCheckSuccess(deviceUUID) {
    const healthState = this.connectionHealthStates[deviceUUID];
    const pc = this.globalState.getPeerConnection(deviceUUID);

    if (healthState) {
      healthState.isHealthy = true;
    }

    // Reset consecutive failures
    this.consecutiveFailures[deviceUUID] = 0;

    // Update last known good state
    if (pc) {
      this.lastKnownGoodStates[deviceUUID] = {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle failed health check
   * @param {string} deviceUUID - Participant ID
   * @param {string} reason - Failure reason
   * @private
   */
  _handleHealthCheckFailure(deviceUUID, reason) {
    const healthState = this.connectionHealthStates[deviceUUID];
    const statistics = this.healthStatistics[deviceUUID];

    if (healthState) {
      healthState.isHealthy = false;
    }

    if (statistics) {
      statistics.failedChecks++;
    }

    // Increment consecutive failures
    this.consecutiveFailures[deviceUUID] =
      (this.consecutiveFailures[deviceUUID] || 0) + 1;

    this.logger.info(
      `Health check failed for ${deviceUUID}: ${reason} (consecutive failures: ${this.consecutiveFailures[deviceUUID]})`
    );

    // Trigger recovery if too many consecutive failures
    if (this.consecutiveFailures[deviceUUID] >= this.MAX_FAILED_CHECKS) {
      this._triggerRecovery(deviceUUID);
    }
  }

  /**
   * Trigger connection recovery
   * @param {string} deviceUUID - Participant ID
   * @private
   */
  async _triggerRecovery(deviceUUID) {
    const statistics = this.healthStatistics[deviceUUID];

    if (statistics) {
      statistics.recoveryAttempts++;
      statistics.lastRecoveryTime = Date.now();
    }

    this.logger.info(
      `Triggering recovery for ${deviceUUID} after ${this.consecutiveFailures[deviceUUID]} consecutive failures`
    );

    try {
      // Get recovery manager from global state or components
      const recoveryManager = this.globalState.getRecoveryManager();
      if (recoveryManager) {
        await recoveryManager.attemptConnectionRecovery(deviceUUID);
      } else {
        this.logger.info("No recovery manager available");
      }
    } catch (error) {
      this.logger.info(
        `Recovery attempt failed for ${deviceUUID}: ${error.message}`
      );
    }
  }

  /**
   * Clean up all health monitoring
   */
  cleanup() {
    // Stop all health check intervals
    Object.keys(this.healthCheckIntervals).forEach((deviceUUID) => {
      this.stopHealthMonitoring(deviceUUID);
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
