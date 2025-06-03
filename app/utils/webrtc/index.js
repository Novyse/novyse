import { GlobalState } from './core/GlobalState.js';
import PeerConnectionManager from './core/PeerConnectionManager.js';
import { StreamManager } from './core/StreamManager.js';
import { ConnectionTracker } from './core/ConnectionTracker.js';
import { SignalingManager } from './signaling/SignalingManager.js';
import { ICEManager } from './signaling/ICEManager.js';
import { ScreenShareManager } from './features/ScreenShareManager.js';
import VoiceActivityDetection from './features/VAD/VoiceActivityDetection.js';
import { PinManager } from './features/PinManager.js';
import { HealthChecker } from './features/HealthChecker.js';
import { RecoveryManager } from './features/RecoveryManager.js';
import WebRTCLogger from './logging/WebRTCLogger.js';
import { LOG_LEVELS } from './logging/LogLevels.js';
import EventReceiver from './utils/EventReceiver.js';
import { WebRTCUtils } from './utils/WebRTCUtils.js';
import { MediaUtils } from './utils/MediaUtils.js';

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
        throw new Error('Failed to initialize GlobalState');
    }else{
        console.log('GlobalState initialized successfully with myId:', myId, 'and chatId:', chatId);
    }

    this._initialize();
    
    this.logger.info('WebRTCManager', 'WebRTC Manager initialized successfully');
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
      voiceActivityDetection: this.voiceActivityDetection,
      pinManager: this.pinManager,
      healthChecker: this.healthChecker,
      recoveryManager: this.recoveryManager
    });
  }
  
  /**
   * Initialize WebRTC components
   */
  _initialize() {
    
  this.logger.info('WebRTCManager', 'Initializing WebRTC Manager...');

    // Initialize event receiver
    this.eventReceiver = new EventReceiver(this.logger,this.globalState);
    // Setup component cross-references
    this._setupComponentReferences();
    
    // Initialize utilities
    this.webrtcUtils = new WebRTCUtils(this.logger);
    this.mediaUtils = new MediaUtils(this.logger);    // Initialize core components
    this.peerConnectionManager = PeerConnectionManager;
    this.peerConnectionManager.globalState = this.globalState;
    this.streamManager = new StreamManager(this.globalState, this.logger);
    this.connectionTracker = new ConnectionTracker(this.globalState, this.logger);
    
    // Initialize signaling
    this.signalingManager = new SignalingManager(this.globalState, this.logger, this);
    this.iceManager = new ICEManager(this.globalState, this.logger);
    
    // Assign ICE manager to peer connection manager
    this.peerConnectionManager.iceManager = this.iceManager;
    
    // Initialize features
    this.screenShareManager = new ScreenShareManager(this.globalState, this.logger);
    this.voiceActivityDetection = new VoiceActivityDetection(this.globalState, this.logger);
    this.pinManager = new PinManager(this.globalState, this.logger);
    
    // Initialize health monitoring
    this.healthChecker = new HealthChecker(this.globalState, this.logger);
    this.recoveryManager = new RecoveryManager(this.globalState, this.logger);
    
    // Initialize voice activity detection
    this.voiceActivityDetection.initialize(this.globalState);

    
    this.logger.info('WebRTCManager', 'All components initialized');
  }
  
  // ===== PUBLIC API METHODS =====
  
  /**
   * Set log level for all WebRTC components
   * @param {number} level - Log level from LOG_LEVELS
   */
  setLogLevel(level) {
    this.logger.setLogLevel(level);
    this.logger.info('WebRTCManager', `Log level set to ${level}`);
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
  async regenerate(myId, chatId, callbacks) {
    this.logger.info('WebRTCManager', 'Regenerating WebRTC Manager...');
    
    // Store existing user data for reconnection
    const existingUsers = Object.values(this.globalState.userData);
    
    // Cleanup current state
    await this.closeAllConnections(false);
    
    // Update global state
    this.globalState.regenerate(myId, chatId, callbacks);
    
    // Reinitialize
    this._initialize();
    
    // Reconnect with existing users
    if (existingUsers.length > 0) {
      this.logger.info('WebRTCManager', `Reconnecting with ${existingUsers.length} existing users`);
      setTimeout(async () => {
        for (const userData of existingUsers) {
          if (userData.from !== myId) {
            this.connectToNewParticipant(userData);
          }
        }
      }, 500);
    }
    
    this.logger.info('WebRTCManager', 'WebRTC Manager regenerated successfully');
  }
  
  // ===== STREAM MANAGEMENT API =====
  
  /**
   * Start local media stream
   */
  startLocalStream(audioOnly = true) {
    return this.streamManager.startLocalStream(audioOnly);
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
  closeLocalStream() {
    this.streamManager.closeLocalStream();
  }
  
  /**
   * Get local stream
   */
  getLocalStream() {
    return this.globalState.localStream;
  }
  
  /**
   * Get remote streams
   */
  getRemoteStreams() {
    return this.globalState.remoteStreams;
  }
  
  /**
   * Get remote screen streams
   */
  getRemoteScreenStreams() {
    return this.globalState.remoteScreenStreams;
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
    // Close screen shares first
    await this.screenShareManager.stopAllScreenShares();
    
    // Close all peer connections
    this.peerConnectionManager.closeAllPeerConnections();
    
    // Close local stream
    if (closeLocalStream) {
        this.streamManager.closeLocalStream();
    }

    // Close VAD
    this.voiceActivityDetection.cleanup();
    
    // Stop health monitoring
    this.healthChecker.cleanup();
      // Cleanup event receiver
    this.eventReceiver.destroy();
    
    // Reset global state
    this.globalState.cleanup();
    
    this.logger.info('WebRTCManager', 'All connections closed and resources cleaned up');
  }
  
  // ===== SCREEN SHARING API =====
  
  /**
   * Start screen sharing
   */
  async addScreenShareStream(screenShareId, existingStream = null) {
    return await this.screenShareManager.addScreenShareStream(screenShareId, existingStream);
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
  
  /**
   * Get screen share streams
   */
  getScreenShareStreams() {
    return this.screenShareManager.getScreenShareStreams();
  }
  
  /**
   * Check if any screen sharing is active
   */
  hasActiveScreenShare() {
    return this.screenShareManager.hasActiveScreenShare();
  }
  
  // ===== PIN MANAGEMENT API =====
  
  /**
   * Set pinned user/rectangle
   */
  setPinnedUser(rectangleId) {
    return this.pinManager.setPinnedUser(rectangleId);
  }
  
  /**
   * Get pinned user/rectangle
   */
  getPinnedUser() {
    return this.pinManager.getPinnedUser();
  }
  
  /**
   * Toggle pin for user/rectangle
   */
  togglePinUser(rectangleId) {
    return this.pinManager.togglePinUser(rectangleId);
  }
  
  /**
   * Clear pin if matches specified ID
   */
  clearPinIfUser(rectangleId) {
    this.pinManager.clearPinIfUser(rectangleId);
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
  
  /**
   * Set existing users in chat
   */
  async setExistingUsers(existingUsers) {
    return await this.signalingManager.setExistingUsers(existingUsers);
  }
  
  // ===== AUDIO CONTEXT API =====
  
  /**
   * Set audio context reference
   */
  setAudioContext(audioContext) {
    this.globalState.audioContextRef = audioContext;
    this.logger.info('WebRTCManager', 'Audio context reference set');
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
    if (callback && typeof callback === 'function') {
      try {
        return callback(...args);
      } catch (error) {
        this.logger.error('WebRTCManager', `Error executing callback ${callbackName}:`, error);
      }
    }
    return null;
  }

  // ===== UTILITY METHODS =====
  
  /**
   * Notify UI components of stream updates
   */
  notifyStreamUpdate() {
    if (this.globalState.callbacks.onStreamUpdate) {
      this.globalState.callbacks.onStreamUpdate();
    }
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
  
  // ===== PIN MANAGEMENT API =====
  
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
    this.logger.info('WebRTCManager', 'Starting WebRTC cleanup...');
    
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
      
      this.logger.info('WebRTCManager', 'WebRTC cleanup completed successfully');
    } catch (error) {
      this.logger.error('WebRTCManager', 'Error during WebRTC cleanup', error);
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
      networkInfo: this.webrtcUtils?.getNetworkInfo()
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
    this.logger.info('WebRTCManager', `Video enabled state set to: ${enabled}`);
  }
}

// Create and export singleton instance
const webRTCManager = new WebRTCManager();
export default webRTCManager;
