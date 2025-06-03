import logger from '../logging/WebRTCLogger.js';

/**
 * Oggetto che contiene TUTTI i valori globali per WebRTC
 * Questo è il single source of truth per lo stato WebRTC
 */
class GlobalState {
  constructor(myId = null, chatId = null, callbacks = {}) {
    // ===== IDENTIFICATORI =====
    this.myId = myId;
    this.chatId = chatId;

    // ===== PEER CONNECTIONS =====
    this.peerConnections = {}; // { participantId: RTCPeerConnection }
    this.userData = {}; // { participantId: { handle, from, is_speaking, etc. } }
    this.negotiationInProgress = {}; // { participantId: boolean }

    // ===== STREAM MANAGEMENT =====
    this.localStream = null;
    this.remoteStreams = {}; // { participantId: MediaStream }
    this.remoteScreenStreams = {}; // { participantId: { streamId: MediaStream } }
    this.remoteStreamMetadata = {}; // { participantId: { streamId: 'webcam'|'screenshare' } }
    
    // Screen sharing
    this.screenStreams = {}; // { streamId: MediaStream }
    this.screenStreamCounter = 0;

    // ===== VOICE ACTIVITY DETECTION =====
    this.speakingUsers = new Set();

    // ===== AUDIO CONTEXT =====
    this.audioContextRef = null;

    // ===== PIN MANAGEMENT =====
    this.pinnedUserId = null;

    // ===== STABILITY & RECONNECTION =====
    this.connectionStates = {}; // Track connection states per peer
    this.connectionTimestamps = {}; // Track connection attempt timestamps
    this.negotiationInProgress = {}; // Track ongoing negotiations
    this.reconnectionAttempts = {}; // Track number of reconnection attempts per peer
    this.reconnectionTimeouts = {}; // Track reconnection timeouts  
    this.connectionHealthCheckers = {}; // Health check intervals per connection
    this.lastKnownGoodStates = {}; // Track last known good connection states
    this.iceCandidateQueues = {}; // Queue ICE candidates for early-arriving candidates
    this.iceGatheringTimeouts = {}; // ICE gathering timeouts per participant

    // ===== PIN HISTORY =====
    this.pinHistory = []; // Array to track pin changes
    
    // ===== HEALTH MONITORING =====
    this.healthStatus = {}; // Track health status per peer
    this.healthTimestamps = {}; // Track last health check timestamps
    
    // ===== RECOVERY MANAGEMENT =====
    this.recoveryAttempts = {}; // Track recovery attempts per peer
    this.recoveryStrategies = {}; // Track which recovery strategies were used
    
    // ===== VOICE ACTIVITY DETECTION EXTENDED =====
    this.vadInstances = {}; // Store VAD instances per user
    this.speakingThreshold = 0.01; // Default speaking threshold
    this.speakingHistory = {}; // Track speaking patterns per user
      // ===== MEDIA CONSTRAINTS =====
    this.currentConstraints = null; // Store current media constraints
    this.deviceCapabilities = null; // Store device capabilities
    
    // ===== CALLBACKS =====
    this.callbacks = callbacks || {};
    this.onLocalStreamReady = callbacks.onLocalStreamReady || null;
    this.onPeerConnectionStateChange = callbacks.onPeerConnectionStateChange || null;
    this.onParticipantLeft = callbacks.onParticipantLeft || null;
    this.onStreamUpdate = callbacks.onStreamUpdate || null;
    this.onSpeakingStatusChange = null;

    // ===== EVENT RECEIVER =====
    this.eventReceiver = null;
    this.eventHistory = []; // Track recent events for debugging
    this.maxEventHistory = 100; // Limit event history size

    logger.info('GlobalState', 'Stato globale WebRTC inizializzato');
  }

  // ===== METODI DI ACCESSO E MODIFICA =====
  /**
   * Inizializza lo stato con i parametri base
   */
  initialize(myId, chatId, callbacks = {}) {
    this.myId = myId;
    this.chatId = chatId;
    
    // Update callbacks object
    this.callbacks = callbacks;
    
    // Imposta callbacks se forniti
    if (callbacks.onLocalStreamReady) this.onLocalStreamReady = callbacks.onLocalStreamReady;
    if (callbacks.onPeerConnectionStateChange) this.onPeerConnectionStateChange = callbacks.onPeerConnectionStateChange;
    if (callbacks.onParticipantLeft) this.onParticipantLeft = callbacks.onParticipantLeft;
    if (callbacks.onStreamUpdate) this.onStreamUpdate = callbacks.onStreamUpdate;
    if (callbacks.onSpeakingStatusChange) this.onSpeakingStatusChange = callbacks.onSpeakingStatusChange;

    logger.info('GlobalState', `Stato inizializzato per utente ${myId} in chat ${chatId}`);
  }

  /**
   * Get my participant ID
   * @returns {string|null} My participant ID
   */
  getMyId() {
    return this.myId;
  }

    /**
   * Get my participant ID
   * @returns {string|null} Active chat ID
   */
  getChatId() {
    return this.chatId;
  }

  /**
   * Pulisce completamente lo stato
   */
  cleanup() {
    logger.info('GlobalState', 'Inizio pulizia stato globale');

    // Clear timeouts e intervals
    Object.values(this.reconnectionTimeouts).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });

    Object.values(this.connectionHealthCheckers).forEach(checker => {
      if (checker) clearInterval(checker);
    });

    // Reset arrays e objects
    this.peerConnections = {};
    this.userData = {};
    this.negotiationInProgress = {};
    this.remoteStreams = {};
    this.remoteScreenStreams = {};
    this.remoteStreamMetadata = {};
    this.screenStreams = {};
    this.speakingUsers.clear();
    this.connectionStates = {};
    this.connectionTimestamps = {};
    this.reconnectionAttempts = {};
    this.reconnectionTimeouts = {};
    this.connectionHealthCheckers = {};
    this.lastKnownGoodStates = {};
    this.iceCandidateQueues = {};
    this.iceGatheringTimeouts = {};
    this.pinHistory = [];
    this.healthStatus = {};
    this.healthTimestamps = {};
    this.recoveryAttempts = {};
    this.recoveryStrategies = {};
    this.vadInstances = {};
    this.speakingHistory = {};

    // Reset identifiers
    this.myId = null;
    this.chatId = null;
    this.pinnedUserId = null;
    this.screenStreamCounter = 0;

    // Reset streams
    this.audioContextRef = null;

    // Reset callbacks
    this.onLocalStreamReady = null;
    this.onPeerConnectionStateChange = null;
    this.onParticipantLeft = null;
    this.onStreamUpdate = null;
    this.onSpeakingStatusChange = null;

    // Reset event receiver
    this.eventReceiver = null;
    this.eventHistory = [];

    logger.info('GlobalState', 'Pulizia stato globale completata');
  }

  // ===== METODI PER PEER CONNECTIONS =====

  addPeerConnection(participantId, peerConnection, userData) {
    this.peerConnections[participantId] = peerConnection;
    this.userData[participantId] = userData;
    logger.debug('GlobalState', `Aggiunta peer connection per ${participantId}`);
  }

  removePeerConnection(participantId) {
    delete this.peerConnections[participantId];
    delete this.userData[participantId];
    delete this.negotiationInProgress[participantId];
    logger.debug('GlobalState', `Rimossa peer connection per ${participantId}`);
  }

  getPeerConnection(participantId) {
    return this.peerConnections[participantId];
  }

  getAllPeerConnections() {
    return { ...this.peerConnections };
  }

  setNegotiationInProgress(participantId, isInProgress) {
    this.negotiationInProgress[participantId] = isInProgress;
    logger.debug('GlobalState', `Negotiation in progress per ${participantId}: ${isInProgress}`);
  }

  isNegotiationInProgress(participantId) {
    return this.negotiationInProgress[participantId] || false;
  }

  // ===== METODI PER STREAM =====

  setLocalStream(stream) {
    this.localStream = stream;
    logger.debug('GlobalState', 'Local stream impostato');
  }

  addRemoteStream(participantId, stream) {
    this.remoteStreams[participantId] = stream;
    logger.debug('GlobalState', `Remote stream aggiunto per ${participantId}`);
  }

  removeRemoteStream(participantId) {
    delete this.remoteStreams[participantId];
    logger.debug('GlobalState', `Remote stream rimosso per ${participantId}`);
  }

  addScreenShare(streamId, stream) {
    this.screenStreams[streamId] = stream;
    logger.debug('GlobalState', `Screen share aggiunto: ${streamId}`);
  }

  removeScreenShare(streamId) {
    delete this.screenStreams[streamId];
    logger.debug('GlobalState', `Screen share rimosso: ${streamId}`);
  }

  /**
   * Get all screen share streams
   */
  getAllScreenStreams() {
    return { ...this.screenStreams };
  }

  // ===== METODI PER SPEAKING USERS =====

  setUserSpeaking(userId, isSpeaking) {
    if (isSpeaking) {
      this.speakingUsers.add(userId);
    } else {
      this.speakingUsers.delete(userId);
    }
    
    // Update userData if exists
    if (this.userData[userId]) {
      this.userData[userId].is_speaking = isSpeaking;
    }

    logger.verbose('GlobalState', `User ${userId} speaking: ${isSpeaking}`);
  }

  isUserSpeaking(userId) {
    return this.speakingUsers.has(userId);
  }

  getSpeakingUsers() {
    return Array.from(this.speakingUsers);
  }

  // ===== METODI PER PIN MANAGEMENT =====

  setPinnedUser(userId) {
    this.pinnedUserId = userId;
    logger.debug('GlobalState', `Pinned user impostato: ${userId}`);
  }

  clearPin() {
    this.pinnedUserId = null;
    logger.debug('GlobalState', 'Pin cleared');
  }

  // ===== METODI PER CONNECTION TRACKING =====

  initializeConnectionTracking(participantId) {
    this.connectionStates[participantId] = "connecting";
    this.connectionTimestamps[participantId] = Date.now();
    this.reconnectionAttempts[participantId] = 0;
    this.lastKnownGoodStates[participantId] = null;
    this.iceCandidateQueues[participantId] = [];
    logger.debug('GlobalState', `Connection tracking inizializzato per ${participantId}`);
  }

  clearConnectionTracking(participantId) {
    delete this.connectionStates[participantId];
    delete this.connectionTimestamps[participantId];
    delete this.reconnectionAttempts[participantId];
    delete this.lastKnownGoodStates[participantId];
    delete this.iceCandidateQueues[participantId];

    // Clear timeouts and intervals
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
      delete this.reconnectionTimeouts[participantId];
    }

    if (this.connectionHealthCheckers[participantId]) {
      clearInterval(this.connectionHealthCheckers[participantId]);
      delete this.connectionHealthCheckers[participantId];
    }

    logger.debug('GlobalState', `Connection tracking pulito per ${participantId}`);
  }

  // ===== METODI PER ICE CANDIDATE QUEUE =====

  /**
   * Get queued ICE candidates for a participant
   * @param {string} participantId - ID del partecipante
   * @returns {Array} Array of queued ICE candidates
   */
  getQueuedICECandidates(participantId) {
    return this.iceCandidateQueues[participantId] || [];
  }

  /**
   * Queue an ICE candidate for a participant
   * @param {string} participantId - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE da accodare
   */
  queueICECandidate(participantId, candidate) {
    if (!this.iceCandidateQueues[participantId]) {
      this.iceCandidateQueues[participantId] = [];
    }
    this.iceCandidateQueues[participantId].push(candidate);
    logger.debug('GlobalState', `ICE candidate accodato per ${participantId}. Coda: ${this.iceCandidateQueues[participantId].length}`);
  }

  /**
   * Clear all queued ICE candidates for a participant
   * @param {string} participantId - ID del partecipante
   */
  clearQueuedICECandidates(participantId) {
    if (this.iceCandidateQueues[participantId]) {
      this.iceCandidateQueues[participantId] = [];
      logger.debug('GlobalState', `Coda ICE candidates pulita per ${participantId}`);
    }
  }

  // ===== METODI DI STATO E DIAGNOSTICA =====

  /**
   * Ottieni un report completo dello stato
   */
  getStateReport() {
    return {
      myId: this.myId,
      chatId: this.chatId,
      peerConnectionsCount: Object.keys(this.peerConnections).length,
      remoteStreamsCount: Object.keys(this.remoteStreams).length,
      screenSharesCount: Object.keys(this.screenStreams).length,
      speakingUsersCount: this.speakingUsers.size,
      hasLocalStream: !!this.localStream,
      pinnedUser: this.pinnedUserId,
      reconnectionAttempts: { ...this.reconnectionAttempts },
      connectionStates: { ...this.connectionStates }
    };
  }

  /**
   * Stampa un report dello stato per debugging
   */
  printStateReport() {
    const report = this.getStateReport();
    logger.info('GlobalState', 'Report stato WebRTC:', report);
  }

  /**
   * Add event to history for debugging
   */
  addEventToHistory(eventType, data) {
    const event = {
      timestamp: Date.now(),
      type: eventType,
      data: data
    };
    
    this.eventHistory.push(event);
    
    // Keep only recent events
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.shift();
    }
  }
  
  /**
   * Get recent event history
   */
  getEventHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }
  
  /**
   * Update health status for a peer
   */
  updateHealthStatus(peerId, status) {
    this.healthStatus[peerId] = status;
    this.healthTimestamps[peerId] = Date.now();
  }
  
  /**
   * Get health status for a peer or all peers
   */
  getHealthStatus(peerId = null) {
    if (peerId) {
      return this.healthStatus[peerId] || 'unknown';
    }
    return { ...this.healthStatus };
  }
  
  /**
   * Track recovery attempt
   */
  trackRecoveryAttempt(peerId, strategy) {
    if (!this.recoveryAttempts[peerId]) {
      this.recoveryAttempts[peerId] = [];
    }
    
    this.recoveryAttempts[peerId].push({
      strategy,
      timestamp: Date.now()
    });
    
    this.recoveryStrategies[peerId] = strategy;
  }
  
  /**
   * Get recovery attempts for a peer
   */
  getRecoveryAttempts(peerId) {
    return this.recoveryAttempts[peerId] || [];
  }
  
  /**
   * Update speaking history
   */
  updateSpeakingHistory(userId, isSpeaking) {
    if (!this.speakingHistory[userId]) {
      this.speakingHistory[userId] = [];
    }
    
    this.speakingHistory[userId].push({
      isSpeaking,
      timestamp: Date.now()
    });
    
    // Keep only recent history (last 50 events)
    if (this.speakingHistory[userId].length > 50) {
      this.speakingHistory[userId].shift();
    }
  }
  
  /**
   * Get speaking pattern for a user
   */
  getSpeakingHistory(userId) {
    return this.speakingHistory[userId] || [];
  }
  
  /**
   * Set device capabilities
   */
  setDeviceCapabilities(capabilities) {
    this.deviceCapabilities = capabilities;
  }
  
  /**
   * Get device capabilities
   */
  getDeviceCapabilities() {
    return this.deviceCapabilities;
  }
  
  /**
   * Set current media constraints
   */
  setCurrentConstraints(constraints) {
    this.currentConstraints = constraints;
  }
  
  /**
   * Get current media constraints
   */
  getCurrentConstraints() {
    return this.currentConstraints;
  }
  
  /**
   * Enhanced state report including new components
   */
  getEnhancedStateReport() {
    return {
      // Basic state
      myId: this.myId,
      chatId: this.chatId,
      
      // Connections
      activeConnections: Object.keys(this.peerConnections).length,
      connectionStates: { ...this.connectionStates },
      healthStatus: { ...this.healthStatus },
      
      // Streams
      hasLocalStream: !!this.localStream,
      remoteStreamCount: Object.keys(this.remoteStreams).length,
      screenStreamCount: Object.keys(this.screenStreams).length,
      
      // Voice Activity
      speakingUsers: Array.from(this.speakingUsers),
      speakingThreshold: this.speakingThreshold,
      
      // Pin Management
      pinnedUser: this.pinnedUserId,
      pinHistoryLength: this.pinHistory.length,
      
      // System Health
      recoveryAttempts: Object.keys(this.recoveryAttempts).length,
      recentEvents: this.eventHistory.length,
      
      // Capabilities
      deviceCapabilities: this.deviceCapabilities,
      currentConstraints: this.currentConstraints
    };
  }

  /**
   * Get callback by name
   * @param {string} callbackName - Nome del callback da ottenere
   * @returns {Function|null} Il callback se esiste, null altrimenti
   */
  getCallback(callbackName) {
    return this.callbacks[callbackName] || null;
  }

  /**
   * Execute callback if it exists
   * @param {string} callbackName - Nome del callback da eseguire
   * @param {...any} args - Argomenti da passare al callback
   * @returns {any} Il risultato del callback o null
   */
  executeCallback(callbackName, ...args) {
    const callback = this.getCallback(callbackName);
    if (callback && typeof callback === 'function') {
      try {
        return callback(...args);
      } catch (error) {
        logger.error('GlobalState', `Error executing callback ${callbackName}:`, error);
      }
    }
    return null;
  }
  
  /**
   * Regenerate global state with new parameters
   */
  regenerate(myId, chatId, callbacks = {}) {
    // Store existing callbacks if no new ones provided
    const existingCallbacks = { ...this.callbacks };
    
    // Clean up existing state
    this.cleanup();
    
    // Set new core values
    this.myId = myId;
    this.chatId = chatId;
    
    // Update callbacks if provided, otherwise restore existing
    if (callbacks && Object.keys(callbacks).length > 0) {
      this.callbacks = { ...callbacks };
    } else {
      this.callbacks = existingCallbacks;
    }
    
    logger.info('GlobalState', `Global state regenerated for user ${myId} in chat ${chatId}`);
  }
  
  // ===== ICE TIMEOUT MANAGEMENT =====
  
  /**
   * Set ICE gathering timeout for a participant
   * @param {string} participantId - ID del partecipante
   * @param {number} timeoutId - ID del timeout
   */
  setICEGatheringTimeout(participantId, timeoutId) {
    if (!this.iceGatheringTimeouts) {
      this.iceGatheringTimeouts = {};
    }
    this.iceGatheringTimeouts[participantId] = timeoutId;
  }

  /**
   * Get ICE gathering timeout for a participant
   * @param {string} participantId - ID del partecipante
   * @returns {number|null} ID del timeout o null
   */
  getICEGatheringTimeout(participantId) {
    return this.iceGatheringTimeouts?.[participantId] || null;
  }

  /**
   * Clear ICE gathering timeout for a participant
   * @param {string} participantId - ID del partecipante
   */
  clearICEGatheringTimeout(participantId) {
    if (this.iceGatheringTimeouts?.[participantId]) {
      delete this.iceGatheringTimeouts[participantId];
    }
  }
}

export { GlobalState };

// Default export for Expo Router compatibility
export default GlobalState;
