import { Platform } from "react-native";
import logger from "../../logging/WebRTCLogger.js";
import VAD from "./methods.js";

/**
 * Voice Activity Detection Manager
 * Manages voice activity detection for WebRTC streams
 */
class VoiceActivityDetection {
  constructor(globalState, loggerInstance) {
    this.globalState = globalState;
    this.logger = loggerInstance || logger;

    this.initialized = false;
    this.vadActive = false;

    this.logger.debug(
      "VoiceActivityDetection",
      "VoiceActivityDetection initialized"
    );
  }

  /**
   * Initialize Voice Activity Detection
   * @param {GlobalState} globalState - Global WebRTC state
   */
  initialize(globalState) {
    if (this.initialized) {
      this.logger.warn("VoiceActivityDetection", "VAD already initialized");
      return;
    }

    if (globalState) {
      this.globalState = globalState;
    }

    this.initialized = true;
    this.logger.info(
      "VoiceActivityDetection",
      "VAD manager initialized successfully"
    );

    this.startVAD();
  }

  /**
   * Start Voice Activity Detection for local stream
   */
  async startVAD() {
    if (!this.initialized) {
      this.logger.warn("VoiceActivityDetection", "VAD not initialized");
      return false;
    }

    const localStream = this.globalState.getLocalStream();
    if (!localStream) {
      this.logger.warn(
        "VoiceActivityDetection",
        "No local stream available for VAD"
      );
      return false;
    }

    if (this.vadActive) {
      this.logger.warn("VoiceActivityDetection", "VAD already active");
      return true;
    }

    try {
      await VAD.initializeVoiceActivityDetection(localStream);
      this.vadActive = true;
      this.logger.info("VoiceActivityDetection", "VAD started successfully");
      return true;
    } catch (error) {
      this.logger.error(
        "VoiceActivityDetection",
        "Failed to start VAD:",
        error
      );
      return false;
    }
  }

  /**
   * Stop Voice Activity Detection
   */
  stopVAD() {
    if (!this.vadActive) {
      this.logger.debug("VoiceActivityDetection", "VAD not active");
      return;
    }

    try {
      VAD.stopVoiceActivityDetection();
      this.vadActive = false;
      this.logger.info("VoiceActivityDetection", "VAD stopped successfully");
    } catch (error) {
      this.logger.error("VoiceActivityDetection", "Error stopping VAD:", error);
    }
  }

  /**
   * Set speaking threshold for VAD
   * @param {number} threshold - Speaking threshold (0-1)
   */
  setSpeakingThreshold(threshold) {
    if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
      this.logger.warn(
        "VoiceActivityDetection",
        "Invalid threshold value:",
        threshold
      );
      return;
    }

    this.globalState.speakingThreshold = threshold;
    this.logger.debug(
      "VoiceActivityDetection",
      `Speaking threshold set to ${threshold}`
    );
  }

  /**
   * Get current speaking threshold
   * @returns {number} Current speaking threshold
   */
  getSpeakingThreshold() {
    return this.globalState.speakingThreshold || 0.01;
  }

  /**
   * Set speaking state for a participant
   * @param {string} participantId - Participant ID
   * @param {boolean} isSpeaking - Speaking state
   */
  setSpeakingState(participantId, isSpeaking) {
    try {
      this.globalState.setUserSpeaking(participantId, isSpeaking);
      this.globalState.updateSpeakingHistory(participantId, isSpeaking);

      this.logger.verbose(
        "VoiceActivityDetection",
        `Speaking state set for ${participantId}: ${isSpeaking}`
      );
    } catch (error) {
      this.logger.error(
        "VoiceActivityDetection",
        "Error setting speaking state:",
        error
      );
    }
  }

  /**
   * Get speaking state for a participant
   * @param {string} participantId - Participant ID
   * @returns {boolean} Speaking state
   */
  getSpeakingState(participantId) {
    return this.globalState.isUserSpeaking(participantId);
  }

  /**
   * Get all currently speaking users
   * @returns {Array<string>} Array of speaking user IDs
   */
  getSpeakingUsers() {
    return this.globalState.getSpeakingUsers();
  }

  /**
   * Check if VAD is active
   * @returns {boolean} VAD active state
   */
  isActive() {
    return this.vadActive;
  }

  /**
   * Check if VAD is initialized
   * @returns {boolean} VAD initialized state
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get VAD status
   * @returns {object} VAD status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      active: this.vadActive,
      threshold: this.getSpeakingThreshold(),
      speakingUsers: this.getSpeakingUsers(),
      platform: Platform.OS,
    };
  }

  /**
   * Cleanup Voice Activity Detection
   */
  cleanup() {
    this.logger.info("VoiceActivityDetection", "Starting VAD cleanup...");

    try {
      // Stop VAD if active
      if (this.vadActive) {
        this.stopVAD();
      }

      // Reset state
      this.initialized = false;
      this.vadActive = false;

      this.logger.info("VoiceActivityDetection", "VAD cleanup completed");
    } catch (error) {
      this.logger.error(
        "VoiceActivityDetection",
        "Error during VAD cleanup:",
        error
      );
    }
  }
}

export default VoiceActivityDetection;
