import { GlobalState } from "./core/GlobalState.js";
import PeerConnectionManager from "./core/PeerConnectionManager.js";
import { StreamManager } from "./core/StreamManager.js";
import { StreamMappingManager } from "./core/StreamMappingManager.js";
import { ConnectionTracker } from "./core/ConnectionTracker.js";
import { SignalingManager } from "./signaling/SignalingManager.js";
import { ICEManager } from "./signaling/ICEManager.js";
import { ScreenShareManager } from "./features/ScreenShareManager.js";
import VoiceActivityDetection from "./features/VAD/VoiceActivityDetection.js";
import { PinManager } from "./features/PinManager.js";
import { HealthChecker } from "./features/HealthChecker.js";
import { RecoveryManager } from "./features/RecoveryManager.js";
import WebRTCLogger from "./logging/WebRTCLogger.js";
import { LOG_LEVELS } from "./logging/LogLevels.js";
import EventReceiver from "./utils/EventReceiver.js";
import { WebRTCUtils } from "./utils/WebRTCUtils.js";
import { MediaUtils } from "./utils/MediaUtils.js";
import EventEmitter from "./utils/EventEmitter.js";

/**
 * Main WebRTC Manager - Single point of access for all WebRTC functionality
 * This class coordinates all WebRTC components and provides a unified API
 */
class WebRTCManager {
  constructor(myId = null, chatId = null, callbacks = {}) {
    // Initialize logger first
    this.logger = WebRTCLogger;
    this.logger.setLogLevel(LOG_LEVELS.INFO); // Set default log level

    // Initialize global state
    this.globalState = new GlobalState(myId, chatId, callbacks);
    if (!this.globalState) {
      throw new Error("Failed to initialize GlobalState");
    } else {
      console.log(
        "GlobalState initialized successfully with myId:",
        myId,
        "and chatId:",
        chatId
      );
    }

    this._initialize();

    this.logger.info(
      "WebRTCManager",
      "WebRTC Manager initialized successfully"
    );
  }
  /**
   * Setup cross-references between components
   */
  _setupComponentReferences() {
    // Setup event receiver with component references
    this.eventReceiver.initialize({
      webrtcManager: this,
      signalingManager: this.signalingManager,
      peerConnectionManager: this.peerConnectionManager,
      streamManager: this.streamManager,
      streamMappingManager: this.streamMappingManager,
      voiceActivityDetection: this.voiceActivityDetection,
      pinManager: this.pinManager,
      healthChecker: this.healthChecker,
      recoveryManager: this.recoveryManager,
    });
  }

  /**
   * Initialize WebRTC components
   */
  _initialize() {
    this.logger.info("WebRTCManager", "Initializing WebRTC Manager..."); // Initialize utilities
    this.webrtcUtils = new WebRTCUtils(this.logger);
    this.mediaUtils = new MediaUtils(this.logger);
    // Initialize stream mapping manager first
    this.streamMappingManager = new StreamMappingManager(
      this.globalState,
      this.logger
    );

    // Set the StreamMappingManager in GlobalState for cross-component access
    this.globalState.setStreamMappingManager(this.streamMappingManager);

    // Initialize core components with streamMappingManager
    this.peerConnectionManager = new PeerConnectionManager(
      this.globalState,
      this.streamMappingManager,
    );
    this.streamManager = new StreamManager(this.globalState, this.logger);

    this.connectionTracker = new ConnectionTracker(
      this.globalState,
      this.logger
    );

    // Initialize signaling
    this.signalingManager = new SignalingManager(
      this.globalState,
      this.logger,
      this
    );
    this.iceManager = new ICEManager(this.globalState, this.logger);

    // Assign ICE manager to peer connection manager
    this.peerConnectionManager.iceManager = this.iceManager;

    // Setup renegotiation callback for StreamManager
    this.streamManager.setRenegotiateCallback(() => {
      return this.signalingManager.renegotiateWithAllPeers();
    });

    // Initialize features
    this.pinManager = new PinManager(this.globalState, this.logger);
    this.screenShareManager = new ScreenShareManager(
      this.globalState,
      this.logger,
      this.pinManager
    );
    this.voiceActivityDetection = new VoiceActivityDetection(
      this.globalState,
      this.logger
    );

    // Initialize health monitoring
    this.healthChecker = new HealthChecker(this.globalState, this.logger);
    this.recoveryManager = new RecoveryManager(this.globalState, this.logger);

    // Initialize voice activity detection
    this.voiceActivityDetection.initialize(this.globalState);

    // Initialize event receiver
    this.eventReceiver = new EventReceiver(this.logger, this.globalState);
    // Setup component cross-references
    this._setupComponentReferences();

    this.logger.info("WebRTCManager", "All components initialized");
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Set log level for all WebRTC components
   * @param {number} level - Log level from LOG_LEVELS
   */
  setLogLevel(level) {
    this.logger.setLogLevel(level);
    this.logger.info("WebRTCManager", `Log level set to ${level}`);
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    return this.logger.currentLogLevel;
  }
  /**
   * Regenerate WebRTC manager with new parameters
   */
  async regenerate(myId, chatId, stream) {
    this.logger.info("WebRTCManager", "Regenerating WebRTC Manager...");

    // Cleanup current state
    await this.closeAllConnections(false);
    // Update global state
    this.globalState.regenerate(myId, chatId, stream);


    // Reinitialize
    this._initialize();

    this.logger.info(
      "WebRTCManager",
      "WebRTC Manager regenerated successfully"
    );
  }

  // ===== STREAM MANAGEMENT API =====

  /**
   * Start local media stream
   */
  async startLocalStream(audioOnly = true, audioSettings = {}) {
    return await this.streamManager.startLocalStream(audioOnly,audioSettings);
  }

  /**
   * Add video track to local stream
   */
  async addVideoTrack() {
    return await this.streamManager.addVideoTrack();
  }

  /**
   * Remove video tracks from local stream
   */
  async removeVideoTracks() {
    return await this.streamManager.removeVideoTracks();
  }

   /**
   * Close local stream
   */
  closeAllLocalStream() {
    this.streamManager.closeLocalStream();
    this.screenShareManager.stopAllScreenShares();
  }


  /**
   * Close local stream
   */
  closeLocalStream() {
    this.streamManager.closeLocalStream();
  }

  /**
   * Get local stream
   */
  getLocalStream() {
    return this.globalState.getLocalStream();
  }

  setLocalStream(stream) {
    this.globalState.setLocalStream(stream);
    this.logger.info("WebRTCManager", "Local stream set successfully");
  }


  // ===== CONNECTION MANAGEMENT API =====

  /**
   * Connect to a new participant
   */
  connectToNewParticipant(participant) {
    return this.peerConnectionManager.createPeerConnection(participant);
  }

  /**
   * Close connection with specific participant
   */
  closePeerConnection(participantId) {
    this.peerConnectionManager.closePeerConnection(participantId);
  }
  /**
   * Close all connections
   */
  async closeAllConnections(closeLocalStream = true) {

    // Close all local streams

    // Close local stream
    if (closeLocalStream) {
      this.streamManager.closeLocalStream();
    }

    // Close all screen shares
    await this.screenShareManager.stopAllScreenShares();

    // Close all peer connections
    this.peerConnectionManager.closeAllPeerConnections();

    
    // Close VAD
    this.voiceActivityDetection.cleanup();

    // Stop health monitoring
    this.healthChecker.cleanup();
    // Cleanup event receiver
    this.eventReceiver.destroy();

    // Reset mapping manager
    this.streamMappingManager.cleanup();

    // Reset global state
    this.globalState.cleanup(true);

    this.logger.info(
      "WebRTCManager",
      "All connections closed and resources cleaned up"
    );
  }

  // ===== SCREEN SHARING API =====

  /**
   * Start screen sharing
   */
  async startScreenShare(screenShareUUID, existingStream = null) {
    return await this.screenShareManager.startScreenShare(
      screenShareUUID,
      existingStream
    );
  }

  /**
   * Get media stream for screen sharing
   * @param {string} platform - Platform type (e.g., 'web', 'mobile')
   * @returns {Promise<MediaStream>} Media stream for screen sharing
   * */

  async acquireScreenStream(platform){
    return await this.screenShareManager.acquireScreenStream(platform);
  }
  /**
   * Stop screen sharing
   */
  async removeScreenShareStream(streamId) {
    return await this.screenShareManager.stopScreenShare(streamId);
  }
  /**
   * Remove all screen shares
   */
  async removeAllScreenShareStreams() {
    return await this.screenShareManager.stopAllScreenShares();
  }

  isScreenShare(streamId) {
    return this.globalState.isScreenShare(streamId);
  }
  /**
   * Get screen share streams
   */
  getScreenShareStreams() {
    return this.screenShareManager.getScreenShareStreams();
  }

  /**
   * Get a specific screen stream by ID
   */
  getScreenStream(streamId) {
    return this.globalState.getScreenStream(streamId);
  }

  /**
   * Check if any screen sharing is active
   */
  hasActiveScreenShare() {
    return this.screenShareManager.hasActiveScreenShare();
  }

  // ===== PIN MANAGEMENT API =====

  /**
   * Get pinned user/rectangle
   */
  getPinnedUser() {
    return this.pinManager.getPinnedUser();
  }

  /**
   * Toggle pin for user/rectangle
   */
  togglePinById(rectangleId) {
    return this.pinManager.togglePinById(rectangleId);
  }

  /**
   * Clear pin if matches specified ID
   */
  clearPinIfId(rectangleId) {
    this.pinManager.clearPinIfId(rectangleId);
  }

  // ===== SIGNALING API =====

  /**
   * Handle incoming offer
   */
  async handleOffer(message) {
    return await this.signalingManager.handleOffer(message);
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(message) {
    return await this.signalingManager.handleAnswer(message);
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleCandidate(message) {
    return await this.signalingManager.handleCandidate(message);
  }

  /**
   * Handle user joined
   */
  async handleUserJoined(message) {
    return await this.signalingManager.handleUserJoined(message);
  }

  /**
   * Handle user left
   */
  async handleUserLeft(message) {
    return await this.signalingManager.handleUserLeft(message);
  }

  async setcommsData(commsData) {
    this.globalState.setCommsData(commsData);
    const userData = {};
    for (const participantUUID in commsData) {
      if (commsData[participantUUID] && commsData[participantUUID].userData) {
        userData[participantUUID] = commsData[participantUUID].userData;
      }
    }
    return await this.signalingManager.setExistingUsers(userData);
  }

  getActiveStreams(){
    return this.globalState.getAllActiveStreams();
  }

  /**
   * Set existing users in chat
   */
  async setExistingUsers(existingUsers) {
    console.log("DEBUG setExistingUsers - Input data:", existingUsers);
    console.log("DEBUG setExistingUsers - Keys:", Object.keys(existingUsers));
    console.log("DEBUG setExistingUsers - MyId:", this.globalState.getMyId());
    // Aggiungi questo per vedere ogni utente
    for (const [participantId, userData] of Object.entries(existingUsers)) {
      console.log(
        `DEBUG setExistingUsers - Processing user ${participantId}:`,
        userData
      );
    }
    return await this.signalingManager.setExistingUsers(existingUsers);
  }

  // ===== AUDIO CONTEXT API =====

  /**
   * Set audio context reference
   */ 
  setAudioContext(audioContext) {
    this.logger.info("WebRTCManager", "Setting audio context reference:", {
      audioContext: !!audioContext,
      hasAddAudio: audioContext && typeof audioContext.addAudio === "function",
      hasRemoveAudio:
        audioContext && typeof audioContext.removeAudio === "function",
      previousAudioContextRef: !!this.globalState.audioContextRef,
    });

    this.globalState.audioContextRef = audioContext;

    this.logger.info(
      "WebRTCManager",
      "Audio context reference set successfully"
    );
  }

  getAudioContext() {
    if (!this.globalState.audioContextRef) {
      this.logger.warn(
        "WebRTCManager",
        "Audio context reference is not set. Please call setAudioContext() first."
      );
      return null;
    }
    return this.globalState.audioContextRef;
  }

  // ===== HEALTH MONITORING API =====

  /**
   * Get connection statistics
   */
  getConnectionStats(participantId = null) {
    return this.connectionTracker.getConnectionStats(participantId);
  }

  /**
   * Print connection report for debugging
   */
  printConnectionReport() {
    this.connectionTracker.printConnectionReport();
  }

  /**
   * Force reconnection for a participant
   */
  async forceReconnection(participantId) {
    return await this.recoveryManager.forceReconnection(participantId);
  }

  /**
   * Reset reconnection attempts
   */
  resetReconnectionAttempts(participantId = null) {
    this.recoveryManager.resetReconnectionAttempts(participantId);
  }

  // ===== CALLBACK ACCESS API =====

  /**
   * Get callback by name
   */
  getCallback(callbackName) {
    return this.globalState.callbacks[callbackName] || null;
  }

  /**
   * Execute callback if it exists
   */
  executeCallback(callbackName, ...args) {
    const callback = this.getCallback(callbackName);
    if (callback && typeof callback === "function") {
      try {
        return callback(...args);
      } catch (error) {
        this.logger.error(
          "WebRTCManager",
          `Error executing callback ${callbackName}:`,
          error
        );
      }
    }
    return null;
  }

  // ===== UTILITY METHODS =====

  /**
   * Notify UI components of stream updates
   */
  notifyLocalStreamUpdate(streamUUID = this.globalState.getMyId,stream) {
    EventEmitter.sendLocalUpdateNeeded(
      this.globalState.getMyId(),
      streamUUID,
      stream
    );
  }

  /**
   * Get chat ID
   */
  getChatId() {
    return this.globalState.chatId;
  }

  /**
   * Get user data
   */
  getUserData(participantId = null) {
    if (participantId) {
      return this.globalState.userData[participantId];
    }
    return this.globalState.userData;
  }

  /**
   * Get comms data
   */
  getCommsData(participantId) {
    return this.globalState.getCommsData(participantId);
  }

  /**
   * Get all peer connections
   */
  getPeerConnections() {
    return this.globalState.peerConnections;
  }

  /**
   * Get specific peer connection
   */
  getPeerConnection(participantId) {
    return this.globalState.peerConnections[participantId];
  }

  // ===== VOICE ACTIVITY DETECTION API =====

  /**
   * Get current speaking state
   */
  getSpeakingState(userId = null) {
    return this.voiceActivityDetection.getSpeakingState(userId);
  }

  /**
   * Get all speaking users
   */
  getSpeakingUsers() {
    return this.voiceActivityDetection.getSpeakingUsers();
  }

  /**
   * Set speaking threshold for VAD
   */
  setSpeakingThreshold(threshold) {
    this.voiceActivityDetection.setSpeakingThreshold(threshold);
  }

  applyAudioProcessing(stream,options = {}) {
    if(!this.streamManager) {
      this.logger.warn(
        "WebRTCManager",
        "StreamManager is not initialized. Cannot apply audio processing."
      );
      return;
    }
    return this.streamManager.applyAudioProcessing(stream, options);
  }

  async updateVAD(){
    if (!this.voiceActivityDetection) {
      this.logger.warn(
        "WebRTCManager",
        "VoiceActivityDetection is not initialized. Cannot update VAD."
      );
      return;
    }
    this.voiceActivityDetection.stopVAD();
    return await this.voiceActivityDetection.startVAD();
  }

  // ===== PIN MANAGEMENT API =====

  /**
   * Pin a track by ID
   */

  togglePinById(rectangleId) {
    return this.pinManager.togglePinById(rectangleId);
  }

  /**
   * Pin a user
   */
  pinUser(userId) {
    return this.pinManager.pinUser(userId);
  }

  /**
   * Unpin a user
   */
  unpinUser(userId) {
    return this.pinManager.unpinUser(userId);
  }

  /**
   * Toggle pin state for a user
   */
  togglePin(userId) {
    return this.pinManager.togglePin(userId);
  }

  /**
   * Get currently pinned user
   */
  getPinnedUser() {
    return this.pinManager.getPinnedUser();
  }

  /**
   * Check if user is pinned
   */
  isUserPinned(userId) {
    return this.pinManager.isUserPinned(userId);
  }

  /**
   * Get pin history
   */
  getPinHistory() {
    return this.pinManager.getPinHistory();
  }

  // ===== UTILITY METHODS API =====

  /**
   * Check WebRTC browser support
   */
  isWebRTCSupported() {
    return this.webrtcUtils.isWebRTCSupported();
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    return this.webrtcUtils.getBrowserInfo();
  }

  /**
   * Get media device capabilities
   */
  async getMediaCapabilities() {
    return await this.webrtcUtils.getMediaCapabilities();
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    return this.webrtcUtils.getNetworkInfo();
  }

  /**
   * Get optimal video constraints
   */
  getOptimalVideoConstraints(options = {}) {
    return this.mediaUtils.getOptimalVideoConstraints(options);
  }

  /**
   * Get optimal audio constraints
   */
  getOptimalAudioConstraints(options = {}) {
    return this.mediaUtils.getOptimalAudioConstraints(options);
  }

  /**
   * Analyze stream quality
   */
  analyzeStreamQuality(stream) {
    return this.mediaUtils.analyzeStreamQuality(stream);
  }

  // ===== CLEANUP API =====

  /**
   * Clean up all WebRTC resources
   */
  cleanup() {
    this.logger.info("WebRTCManager", "Starting WebRTC cleanup...");

    try {
      // Stop health monitoring
      this.healthChecker?.cleanup();

      // Clean up voice activity detection
      this.voiceActivityDetection?.cleanup();

      // Clean up pin manager
      this.pinManager?.cleanup();

      // Clean up event receiver
      this.eventReceiver?.destroy();

      // Clean up screen sharing
      this.screenShareManager?.cleanup();

      // Clean up stream manager
      this.streamManager?.cleanup();

      // Clean up peer connections
      this.peerConnectionManager?.cleanup();

      // Clean up signaling
      this.signalingManager?.cleanup();

      // Clean up global state
      this.globalState?.cleanup();

      this.logger.info(
        "WebRTCManager",
        "WebRTC cleanup completed successfully"
      );
    } catch (error) {
      this.logger.error("WebRTCManager", "Error during WebRTC cleanup", error);
    }
  }

  /**
   * Get system status and diagnostics
   */
  getSystemStatus() {
    return {
      globalState: this.globalState?.getState(),
      connections: this.connectionTracker?.getConnectionStats(),
      streams: this.streamManager?.getStreamInfo(),
      health: this.healthChecker?.getHealthStatus(),
      speaking: this.voiceActivityDetection?.getSpeakingState(),
      pinned: this.pinManager?.getPinnedUser(),
      browserInfo: this.webrtcUtils?.getBrowserInfo(),
      networkInfo: this.webrtcUtils?.getNetworkInfo(),
    };
  }

  /**
   * Get my ID
   */
  getMyId() {
    return this.globalState.myId;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled() {
    return this.globalState.isVideoEnabled || false;
  }

  /**
   * Set video enabled state
   */
  setVideoEnabled(enabled) {
    this.globalState.isVideoEnabled = enabled;
    this.logger.info("WebRTCManager", `Video enabled state set to: ${enabled}`);
  }

  /**
   * Get active screen shares for a participant
   * @param {string} participantId - Participant ID
   * @returns {string[]} Array of active screen share IDs
   */
  getActiveScreenShares(participantId) {
    return this.globalState.getActiveScreenShares(participantId);
  }

  /**
   * Initialize local user data
   * @param {string} handle - Local user handle
   * @param {Object} additionalData - Additional user data
   */
  initializeLocalUserData(handle, additionalData = {}) {
    return this.globalState.initializeLocalUserData(
      this.globalState.myId,
      handle,
      additionalData
    );
  }
}

// Create and export singleton instance
const webRTCManager = new WebRTCManager();
export default webRTCManager;
