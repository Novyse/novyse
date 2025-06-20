import logger from "../logging/WebRTCLogger.js";
import EventEmitter from "../utils/EventEmitter.js";

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
    this.commsData = {}; // { participantId: { userData: {handle, isSpeaking}, activeScreenShares: [streamUUID,streamUUID2] } }
    this.activeStreams = {}; // { participantId: { partecipantUUID : { streamUUID: MediaStream, streamUUID2: MediaStream, ... } }

    this.negotiationInProgress = {}; // { participantId: boolean }

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
    this.onPeerConnectionStateChange =
      callbacks.onPeerConnectionStateChange || null;
    this.onParticipantLeft = callbacks.onParticipantLeft || null;
    this.onStreamUpdate = callbacks.onStreamUpdate || null;
    this.onSpeakingStatusChange = null;

    // ===== EVENT RECEIVER =====
    this.eventReceiver = null;
    this.eventHistory = []; // Track recent events for debugging
    this.maxEventHistory = 100; // Limit event history size

    logger.info("GlobalState", "Stato globale WebRTC inizializzato");
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

    // Initialize activeStreams for this user
    if (!this.activeStreams[myId]) {
      this.activeStreams[myId] = {};
    }

    logger.info(
      "GlobalState",
      `Stato inizializzato per utente ${myId} in chat ${chatId}`
    );
  }

  /**
   * Get a specific callback function
   * @param {string} callbackName - Name of the callback
   * @returns {Function|null} Callback function or null
   */
  getCallback(callbackName) {
    return this.callbacks[callbackName] || null;
  }

  /**
   * Get chat ID
   * @returns {string|null} Chat ID
   */
  getChatId() {
    return this.chatId;
  }

  /**
   * Get my participant ID
   * @returns {string|null} My participant ID
   */
  getMyId() {
    return this.myId;
  }

  /**
   * Pulisce completamente lo stato
   * @param {boolean} preserveAudioContext - Se true, preserva l'audioContextRef durante la pulizia
   */
  cleanup(preserveAudioContext = false) {
    logger.info("GlobalState", "Inizio pulizia stato globale");

    // Clear timeouts e intervals
    Object.values(this.reconnectionTimeouts).forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });

    Object.values(this.connectionHealthCheckers).forEach((checker) => {
      if (checker) clearInterval(checker);
    });

    // Reset arrays e objects
    this.peerConnections = {};
    this.commsData = {};
    this.negotiationInProgress = {};
    this.activeStreams = {};
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

    // Reset streams (preserve audioContextRef if requested)
    if (!preserveAudioContext) {
      this.audioContextRef = null;
    }

    // Reset callbacks
    this.onLocalStreamReady = null;
    this.onPeerConnectionStateChange = null;
    this.onParticipantLeft = null;
    this.onStreamUpdate = null;
    this.onSpeakingStatusChange = null;

    // Reset event receiver
    this.eventReceiver = null;
    this.eventHistory = [];

    logger.info("GlobalState", "Pulizia stato globale completata");
  }

  // ===== METODI PER PEER CONNECTIONS =====

  addPeerConnection(participantId, peerConnection, commData) {
    this.peerConnections[participantId] = peerConnection;

    // Initialize commsData if it doesn't exist, otherwise preserve existing data
    if (!this.commsData[participantId]) {
      this.commsData[participantId] = {
        activeScreenShares: [],
        userData: {
          ...commData,
        },
      };
    } else {
      // Update existing userData while preserving other properties
      this.commsData[participantId].userData = {
        ...this.commsData[participantId].userData,
        ...commData,
      };
    }

    logger.debug(
      "GlobalState",
      `Aggiunta peer connection per ${participantId}`
    );
  }

  removePeerConnection(participantId) {
    delete this.peerConnections[participantId];
    delete this.commsData[participantId];
    delete this.negotiationInProgress[participantId];
    logger.debug("GlobalState", `Rimossa peer connection per ${participantId}`);
  }

  getPeerConnection(participantId) {
    return this.peerConnections[participantId];
  }

  getAllPeerConnections() {
    return { ...this.peerConnections };
  }

  getLocalStream() {
    return this.getActiveStream(this.myId, this.myId);
  }

  setLocalStream(localStream) {
    this.addActiveStream(this.myId, this.myId, localStream);
  }

  getAllLocalActiveStreams() {
    return this.getAllUserActiveStreams(this.getMyId());
  }

  getAllScreenStreams() {
    const myId = this.getMyId();
    const myStreams = this.activeStreams[myId] || {};

    // Create a copy without the stream that has UUID equal to myId
    const filteredStreams = Object.fromEntries(
      Object.entries(myStreams).filter(([streamUUID]) => streamUUID !== myId)
    );

    return filteredStreams;
  }

  getAllActiveStreams() {
    return { ...this.activeStreams };
  }

  setNegotiationInProgress(participantId, isInProgress) {
    this.negotiationInProgress[participantId] = isInProgress;
    logger.debug(
      "GlobalState",
      `Negotiation in progress per ${participantId}: ${isInProgress}`
    );
  }
  isNegotiationInProgress(participantId) {
    return this.negotiationInProgress[participantId] || false;
  }

  /**
   * Atomic check and set for negotiation state to prevent race conditions
   * @param {string} participantId - ID del partecipante
   * @returns {boolean} - true if negotiation was successfully set, false if already in progress
   */
  trySetNegotiationInProgress(participantId) {
    if (this.negotiationInProgress[participantId]) {
      return false; // Already in progress
    }
    this.negotiationInProgress[participantId] = true;
    logger.debug("GlobalState", `Atomic negotiation set for ${participantId}`);
    return true;
  }

  // ===== METODI PER STREAM =====

  addActiveStream(participantId, streamUUID, stream) {
    if (!this.activeStreams[participantId]) {
      this.activeStreams[participantId] = {};
    }
    this.activeStreams[participantId][streamUUID] = stream;
    logger.debug(
      "GlobalState",
      `Active stream aggiunto per ${participantId}: ${streamUUID}`
    );
  }
  getActiveStream(participantId, streamUUID) {
    const activeStreams = this.activeStreams[participantId];
    if (!activeStreams) {
      logger.debug(
        "GlobalState",
        `Nessun active stream trovato per ${participantId}`
      );
      return null;
    }
    return activeStreams[streamUUID];
  }

  getAllUserActiveStreams(participantId) {
    if (!this.activeStreams[participantId]) {
      logger.debug(
        "GlobalState",
        `Nessun active stream trovato per ${participantId}`
      );
      return {};
    }
    return { ...this.activeStreams[participantId] };
  }

  removeAllUserActiveStreams(participantId) {
    if (this.activeStreams[participantId]) {
      delete this.activeStreams[participantId];
      logger.debug(
        "GlobalState",
        `Tutti gli active streams rimossi per ${participantId}`
      );
    }
  }

  setWebcamStatus(participantId, status) {
    if (!this.commsData[participantId]) {
      this.commsData[participantId] = { userData: {} };
    }
    this.commsData[participantId].userData.webcamOn = status;
    logger.debug(
      "GlobalState",
      `Webcam status inviato per ${participantId}: ${status}`
    );
  }

  removeActiveStream(participantId, streamUUID) {
    if (this.activeStreams[participantId]) {
      delete this.activeStreams[participantId][streamUUID];
      logger.debug(
        "GlobalState",
        `Active stream rimosso per ${participantId}: ${streamUUID}`
      );

      // Remove participant entry if no more streams
      if (Object.keys(this.activeStreams[participantId]).length === 0) {
        delete this.activeStreams[participantId];
      }
    }
  }

  removeRemoteStream(participantId) {
    delete this.remoteStreams[participantId];
    logger.debug("GlobalState", `Remote stream rimosso per ${participantId}`);
  }
  /**
   * Add screen share - supports both old and new signatures
   * addScreenShare(participantId, screenShareUUID, stream) - adds to commsData.activeScreenShares and screenStreams
   */
  addScreenShare(partecipantUUID, screenShareUUID, stream = null) {
    // Add to activeStreams
    this.addActiveStream(partecipantUUID, screenShareUUID, stream);

    // Add to commsData activeScreenShares array
    if (!this.commsData[partecipantUUID]) {
      this.commsData[partecipantUUID] = {
        activeScreenShares: [],
      };
    }

    // Add to activeScreenShares if not already present
    if (
      !this.commsData[partecipantUUID].activeScreenShares.includes(
        screenShareUUID
      )
    ) {
      this.commsData[partecipantUUID].activeScreenShares.push(screenShareUUID);
    }

    logger.debug(
      "GlobalState",
      `Screen share added for participant ${partecipantUUID}: ${screenShareUUID}`
    );
  }

  /**
   * Remove screen share - supports both screenShareUUID only and partecipantUUID + screenShareUUID
   */
  removeScreenShare(partecipantUUID, screenShareUUID = null) {
    // Remove from commsData activeScreenShares array
    if (
      this.commsData[partecipantUUID] &&
      Array.isArray(this.commsData[partecipantUUID].activeScreenShares)
    ) {
      const index =
        this.commsData[partecipantUUID].activeScreenShares.indexOf(
          screenShareUUID
        );
      if (index > -1) {
        this.commsData[partecipantUUID].activeScreenShares.splice(index, 1);
      }
    }

    // Remove from activeStreams
    this.removeActiveStream(partecipantUUID, screenShareUUID);

    logger.debug(
      "GlobalState",
      `Screen share removed for participant ${partecipantUUID}: ${screenShareUUID}`
    );
  }

  /**
   * Get active screen shares for a participant
   * @param {string} participantId - Participant ID
   * @returns {Array<string>} Array of screen share stream IDs
   */
  getActiveScreenShares(participantId) {
    if (
      !this.commsData[participantId] ||
      !Array.isArray(this.commsData[participantId].activeScreenShares)
    ) {
      return [];
    }
    return [...this.commsData[participantId].activeScreenShares];
  }

  isScreenShare(participantId, streamUUID) {
    console.debug(
      "GlobalState",
      `Checking if stream ${streamUUID} is a screen share for participant ${participantId}`
    );
    console.log("💞💞💕💕cuoricini", this.commsData);
    // Check if the streamUUID exists in screenStreams
    if (!this.commsData[participantId]) return false;
    if (!Array.isArray(this.commsData[participantId].activeScreenShares))
      return false;
    return this.commsData[participantId].activeScreenShares.includes(
      streamUUID
    );
  }

  /**
   * Set a specific screen stream
   * @param {string} screenShareUUID - Stream ID
   * @param {MediaStream} stream - The screen stream
   */
  setScreenStream(screenShareUUID, stream) {
    this.screenStreams[screenShareUUID] = stream;
    logger.debug("GlobalState", `Screen stream impostato: ${screenShareUUID}`);
  }

  /**
   * Remove a specific screen stream
   * @param {string} screenShareUUID - Stream ID
   */
  removeScreenStream(screenShareUUID) {
    delete this.screenStreams[screenShareUUID];
    logger.debug("GlobalState", `Screen stream rimosso: ${screenShareUUID}`);
  }

  // ===== REMOTE SCREEN STREAMS METHODS =====

  /**
   * Get remote screen streams for a participant
   * @param {string} participantId - Participant ID
   * @returns {Object|null} Object containing screen streams or null
   */
  getRemoteScreenStreams(participantId) {
    return this.remoteScreenStreams[participantId] || null;
  }

  /**
   * Set remote screen streams for a participant
   * @param {string} participantId - Participant ID
   * @param {Object} screenStreams - Object containing screen streams
   */
  setRemoteScreenStreams(participantId, screenStreams) {
    this.remoteScreenStreams[participantId] = screenStreams;
    logger.debug(
      "GlobalState",
      `Remote screen streams impostati per ${participantId}`
    );
  }

  /**
   * Remove a specific remote screen stream
   * @param {string} participantId - Participant ID
   * @param {string} screenShareUUID - Stream ID
   */
  removeRemoteScreenStream(participantId, screenShareUUID) {
    if (
      this.remoteScreenStreams[participantId] &&
      this.remoteScreenStreams[participantId][screenShareUUID]
    ) {
      delete this.remoteScreenStreams[participantId][screenShareUUID];
      logger.debug(
        "GlobalState",
        `Remote screen stream ${screenShareUUID} rimosso per ${participantId}`
      );

      // Remove participant entry if no more streams
      if (Object.keys(this.remoteScreenStreams[participantId]).length === 0) {
        delete this.remoteScreenStreams[participantId];
      }
    }
  }

  // ===== STREAM METADATA METHODS =====

  /**
   * Set stream metadata for a participant
   * @param {string} participantId - Participant ID
   * @param {string} screenShareUUID - Stream ID
   * @param {string} streamType - Stream type ('webcam' or 'screenshare')
   */
  setStreamMetadata(participantId, screenShareUUID, streamType) {
    if (!this.remoteStreamMetadata[participantId]) {
      this.remoteStreamMetadata[participantId] = {};
    }
    this.remoteStreamMetadata[participantId][screenShareUUID] = streamType;
    logger.debug(
      "GlobalState",
      `Stream metadata impostato: ${participantId}/${screenShareUUID} = ${streamType}`
    );
  }

  /**
   * Get stream metadata for a participant
   * @param {string} participantId - Participant ID
   * @returns {Object|null} Stream metadata object or null
   */
  getStreamMetadata(participantId) {
    return this.remoteStreamMetadata[participantId] || null;
  }

  /**
   * Remove stream metadata for a participant
   * @param {string} participantId - Participant ID
   * @param {string} screenShareUUID - Stream ID
   */
  removeStreamMetadata(participantId, screenShareUUID) {
    if (
      this.remoteStreamMetadata[participantId] &&
      this.remoteStreamMetadata[participantId][screenShareUUID]
    ) {
      delete this.remoteStreamMetadata[participantId][screenShareUUID];
      logger.debug(
        "GlobalState",
        `Stream metadata rimosso: ${participantId}/${screenShareUUID}`
      );

      // Remove participant entry if no more metadata
      if (Object.keys(this.remoteStreamMetadata[participantId]).length === 0) {
        delete this.remoteStreamMetadata[participantId];
      }
    }
  }

  /**
   * Remove all stream metadata for a participant (overloaded version)
   * @param {string} participantId - Participant ID
   */
  removeAllStreamMetadata(participantId) {
    if (this.remoteStreamMetadata[participantId]) {
      delete this.remoteStreamMetadata[participantId];
      logger.debug(
        "GlobalState",
        `All stream metadata rimosso per ${participantId}`
      );
    }
  }

  /**
   * Remove all remote screen streams for a participant
   * @param {string} participantId - Participant ID
   */
  removeAllRemoteScreenStreams(participantId) {
    if (this.remoteScreenStreams[participantId]) {
      delete this.remoteScreenStreams[participantId];
      logger.debug(
        "GlobalState",
        `All remote screen streams rimossi per ${participantId}`
      );
    }
  }

  // ===== METODI PER SPEAKING USERS =====

  setUserSpeaking(partecipantUUID, isSpeaking) {
    if (isSpeaking) {
      this.speakingUsers.add(partecipantUUID);
    } else {
      this.speakingUsers.delete(partecipantUUID);
    }

    // Update commsData if exists - isSpeaking is now inside userData
    if (this.commsData[partecipantUUID]) {
      if (!this.commsData[partecipantUUID].userData) {
        this.commsData[partecipantUUID].userData = {};
      }
      this.commsData[partecipantUUID].userData.isSpeaking = isSpeaking;
    }

    logger.verbose(
      "GlobalState",
      `User ${partecipantUUID} speaking: ${isSpeaking}`
    );
  }

  isUserSpeaking(partecipantUUID) {
    // Check both speakingUsers set and commsData for consistency
    const isInSet = this.speakingUsers.has(partecipantUUID);
    const isInCommsData =
      this.commsData[partecipantUUID]?.userData?.isSpeaking || false;

    // Return true if either source indicates the user is speaking
    return isInSet || isInCommsData;
  }

  getSpeakingUsers() {
    // Get users from both sources and merge them
    const fromSet = Array.from(this.speakingUsers);
    const fromCommsData = Object.keys(this.commsData).filter(
      (partecipantUUID) => this.commsData[partecipantUUID]?.userData?.isSpeaking
    );

    // Merge and deduplicate
    const allSpeaking = [...new Set([...fromSet, ...fromCommsData])];
    return allSpeaking;
  }

  // ===== METODI PER PIN MANAGEMENT =====

  setPinnedUser(userId) {
    this.pinnedUserId = userId;
    logger.debug("GlobalState", `Pinned user impostato: ${userId}`);
  }

  clearPin() {
    this.pinnedUserId = null;
    logger.debug("GlobalState", "Pin cleared");
  }

  // ===== METODI PER CONNECTION TRACKING =====
  initializeConnectionTracking(participantId) {
    this.connectionStates[participantId] = "connecting";
    this.connectionTimestamps[participantId] = {
      initialized: Date.now(),
      lastSignalingTransition: null,
    };
    this.reconnectionAttempts[participantId] = 0;
    this.lastKnownGoodStates[participantId] = null;
    this.iceCandidateQueues[participantId] = [];
    logger.debug(
      "GlobalState",
      `Connection tracking inizializzato per ${participantId}`
    );
  }

  forceReloadStreams(participantUUID) {
    // Clear all active streams for the participant
    if (this.activeStreams[participantUUID]) {
      Object.keys(this.activeStreams[participantUUID]).forEach((streamUUID) => {
        EventEmitter.sendLocalUpdateNeeded(
          participantUUID,
          streamUUID,
          this.activeStreams[participantUUID][streamUUID],
          "add_or_update"
        );
      });
      logger.debug(
        "GlobalState",
        `Tutti gli active streams sono stati riaggiornati per ${participantUUID}`
      );
    }
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

    logger.debug(
      "GlobalState",
      `Connection tracking pulito per ${participantId}`
    );
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
   * Queue an ICE candidate for a participant with timestamp for ordered processing
   * @param {string} participantId - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE da accodare
   */
  queueICECandidate(participantId, candidate) {
    if (!this.iceCandidateQueues[participantId]) {
      this.iceCandidateQueues[participantId] = [];
    }

    // Add timestamp for ordered processing to prevent race conditions
    const queuedCandidate = {
      candidate,
      timestamp: Date.now(),
      processed: false,
    };

    this.iceCandidateQueues[participantId].push(queuedCandidate);
    logger.debug(
      "GlobalState",
      `ICE candidate accodato per ${participantId}. Coda: ${this.iceCandidateQueues[participantId].length}`
    );
  }

  /**
   * Get queued ICE candidates for a participant in chronological order
   * @param {string} participantId - ID del partecipante
   * @returns {Array} Array of queued ICE candidates sorted by timestamp
   */
  getQueuedICECandidates(participantId) {
    const queue = this.iceCandidateQueues[participantId] || [];
    // Return only unprocessed candidates, sorted by timestamp
    return queue
      .filter((item) => !item.processed)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.candidate);
  }

  /**
   * Get all queued ICE candidate entries (with metadata) for a participant
   * @param {string} participantId - ID del partecipante
   * @returns {Array} Array of queued ICE candidate entries with metadata
   */
  getQueuedICECandidateEntries(participantId) {
    return this.iceCandidateQueues[participantId] || [];
  }

  /**
   * Mark an ICE candidate as processed to prevent duplicate processing
   * @param {string} participantId - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE da marcare come processato
   */
  markICECandidateAsProcessed(participantId, candidate) {
    const queue = this.iceCandidateQueues[participantId];
    if (queue) {
      const entry = queue.find(
        (item) =>
          !item.processed &&
          item.candidate.candidate === candidate.candidate &&
          item.candidate.sdpMLineIndex === candidate.sdpMLineIndex
      );
      if (entry) {
        entry.processed = true;
        logger.debug(
          "GlobalState",
          `ICE candidate marcato come processato per ${participantId}`
        );
      }
    }
  }
  /**
   * Clear all queued ICE candidates for a participant
   * @param {string} participantId - ID del partecipante
   */
  clearQueuedICECandidates(participantId) {
    if (this.iceCandidateQueues[participantId]) {
      this.iceCandidateQueues[participantId] = [];
      logger.debug(
        "GlobalState",
        `Coda ICE candidates pulita per ${participantId}`
      );
    }
  }

  // ===== METODI PER TIMING SAFEGUARDS =====

  /**
   * Record signaling state transition timing
   * @param {string} participantId - ID del partecipante
   * @param {string} fromState - Stato precedente
   * @param {string} toState - Nuovo stato
   */ recordSignalingStateTransition(participantId, fromState, toState) {
    if (!this.connectionTimestamps[participantId]) {
      this.connectionTimestamps[participantId] = {
        initialized: Date.now(),
        lastSignalingTransition: null,
      };
    }

    // Handle legacy format where connectionTimestamps[participantId] might be a number
    if (typeof this.connectionTimestamps[participantId] === "number") {
      const legacyTimestamp = this.connectionTimestamps[participantId];
      this.connectionTimestamps[participantId] = {
        initialized: legacyTimestamp,
        lastSignalingTransition: null,
      };
    }

    const timestamp = Date.now();
    this.connectionTimestamps[participantId].lastSignalingTransition = {
      fromState,
      toState,
      timestamp,
      transitionId: `${fromState}->${toState}-${timestamp}`,
    };

    logger.debug(
      "GlobalState",
      `Signaling state transition recorded for ${participantId}: ${fromState} -> ${toState}`
    );
  }

  /**
   * Check if enough time has passed since last signaling state transition
   * @param {string} participantId - ID del partecipante
   * @param {number} minIntervalMs - Intervallo minimo in millisecondi
   * @returns {boolean} true se è passato abbastanza tempo
   */
  canTransitionSignalingState(participantId, minIntervalMs = 1000) {
    const timestamps = this.connectionTimestamps[participantId];
    if (!timestamps || !timestamps.lastSignalingTransition) {
      return true;
    }

    const timeSinceLastTransition =
      Date.now() - timestamps.lastSignalingTransition.timestamp;
    return timeSinceLastTransition >= minIntervalMs;
  }

  /**
   * Get last signaling state transition info
   * @param {string} participantId - ID del partecipante
   * @returns {Object|null} Info sulla last transition o null
   */
  getLastSignalingStateTransition(participantId) {
    const timestamps = this.connectionTimestamps[participantId];
    return timestamps ? timestamps.lastSignalingTransition : null;
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
      connectionStates: { ...this.connectionStates },
    };
  }

  /**
   * Stampa un report dello stato per debugging
   */
  printStateReport() {
    const report = this.getStateReport();
    logger.info("GlobalState", "Report stato WebRTC:", report);
  }

  /**
   * Add event to history for debugging
   */
  addEventToHistory(eventType, data) {
    const event = {
      timestamp: Date.now(),
      type: eventType,
      data: data,
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
      return this.healthStatus[peerId] || "unknown";
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      currentConstraints: this.currentConstraints,
    };
  }

  /**
   * Execute callback if it exists
   * @param {string} callbackName - Nome del callback da eseguire
   * @param {...any} args - Argomenti da passare al callback
   * @returns {any} Il risultato del callback o null
   */
  executeCallback(callbackName, ...args) {
    const callback = this.getCallback(callbackName);
    if (callback && typeof callback === "function") {
      try {
        return callback(...args);
      } catch (error) {
        logger.error(
          "GlobalState",
          `Error executing callback ${callbackName}:`,
          error
        );
      }
    }
    return null;
  }

  /**
   * Regenerate global state with new parameters
   */
  async regenerate(myId, chatId, stream = null) {
    // Clean up existing state (preserve audioContextRef during cleanup)
    this.cleanup(true);
    // Set new core values
    this.myId = myId;
    this.chatId = chatId;

    this.setLocalStream(stream);

    logger.info(
      "GlobalState",
      `Global state regenerated for user ${myId} in chat ${chatId}`
    );
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

  // ===== ADDITIONAL ACCESSOR METHODS =====

  /**
   * Get all peer connection IDs
   * @returns {Array<string>} Array of participant IDs
   */
  getAllPeerConnectionIds() {
    return Object.keys(this.peerConnections);
  }

  setCommsData(commsData) {
    // Set commsData for all participants
    this.commsData = commsData;
    logger.debug("GlobalState", "Comms data updated for all participants");
  }

  getCommsData(participantId = null) {
    // Placeholder for comms data, to be implemented when needed
    if (participantId === null) {
      return { ...this.commsData };
    }
    return this.commsData[participantId];
  }

  getActiveStreams(participantId) {
    return this.activeStreams[participantId] || null;
  }

  /**
   * Get local stream
   * @returns {MediaStream|null} Local stream or null
   */
  getLocalStream() {
    return this.getActiveStream(this.myId, this.myId) || null;
  }

  /**
   * Get remote stream for a participant
   * @param {string} participantId - Participant ID
   * @returns {MediaStream|null} Remote stream or null
   */
  getRemoteStream(participantId) {
    return this.remoteStreams[participantId] || null;
  }

  /**
   * Get pinned user ID
   * @returns {string|null} Pinned user ID or null
   */
  getPinnedUser() {
    return this.pinnedUserId;
  }

  // ===== METODI PER INIZIALIZZARE I DATI UTENTE =====

  // ===== MANAGER ACCESSOR METHODS =====
  // These methods will be implemented when the managers are properly integrated

  /**
   * Get API methods instance (placeholder)
   * @returns {Object|null} API methods instance or null
   */
  getAPIMethods() {
    // This will be implemented when API methods are properly integrated
    return null;
  }

  /**
   * Get recovery manager instance (placeholder)
   * @returns {Object|null} Recovery manager instance or null
   */
  getRecoveryManager() {
    // This will be implemented when recovery manager is properly integrated
    return null;
  }

  /**
   * Get signaling manager instance (placeholder)
   * @returns {Object|null} Signaling manager instance or null
   */
  getSignalingManager() {
    // This will be implemented when signaling manager is properly integrated
    return null;
  }

  /**
   * Get peer connection manager instance (placeholder)
   * @returns {Object|null} Peer connection manager instance or null
   */
  getPeerConnectionManager() {
    // This will be implemented when peer connection manager is properly integrated
    return null;
  }

  /**
   * Get pin manager instance (placeholder)
   * @returns {Object|null} Pin manager instance or null
   */
  getPinManager() {
    // This will be implemented when pin manager is properly integrated
    return null;
  }
  /**
   * Get stream mapping manager instance (placeholder)
   * @returns {Object|null} Stream mapping manager instance or null
   */
  getStreamMappingManager() {
    // This will be implemented when stream mapping manager is properly integrated
    return this.streamMappingManager || null;
  }

  /**
   * Set stream mapping manager instance
   * @param {Object} streamMappingManager - Stream mapping manager instance
   */
  setStreamMappingManager(streamMappingManager) {
    this.streamMappingManager = streamMappingManager;
  }

  /**
   * Get event emitter instance (placeholder)
   * @returns {Object|null} Event emitter instance or null
   */
  getEventEmitter() {
    // This will be implemented when event emitter is properly integrated
    return null;
  }

  // ===== DEBUG FUNCTIONS =====
  debugAudioContextState() {
    console.log("[GlobalState] Audio context state:", {
      audioContextRef: !!this.audioContextRef,
      hasAddAudio:
        this.audioContextRef &&
        typeof this.audioContextRef.addAudio === "function",
      hasRemoveAudio:
        this.audioContextRef &&
        typeof this.audioContextRef.removeAudio === "function",
      audioContextType: typeof this.audioContextRef,
    });
  }
}

export { GlobalState };

// Default export for Expo Router compatibility
export default GlobalState;
