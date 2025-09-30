import logger from "../logging/WebRTCLogger.js";
import EventEmitter from "../utils/EventEmitter.js";

/**
 * Oggetto che contiene TUTTI i valori globali per WebRTC
 * Questo è il single source of truth per lo stato WebRTC
 */
class GlobalState {
  constructor(deviceUUID = null, commUUID = null, callbacks = {}) {
    // ===== IDENTIFICATORI =====
    this.deviceUUID = deviceUUID;
    this.commUUID = commUUID;

    // ===== PEER CONNECTIONS =====
    this.peerConnections = {}; // { deviceUUID: RTCPeerConnection }
    this.commData = {}; // { deviceUUID: { userData: {handle, isSpeaking}, activeScreenShares: [streamUUID,streamUUID2] } }
    this.activeStreams = {}; // { deviceUUID: { partecipantUUID : { streamUUID: MediaStream, streamUUID2: MediaStream, ... } }

    this.negotiationInProgress = {}; // { deviceUUID: boolean }

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
  initialize(deviceUUID, commUUID, callbacks = {}) {
    this.deviceUUID = deviceUUID;
    this.commUUID = commUUID;

    // Update callbacks object
    this.callbacks = callbacks;

    // Initialize activeStreams for this user
    if (!this.activeStreams[deviceUUID]) {
      this.activeStreams[deviceUUID] = {};
    }

    logger.info(
      "GlobalState",
      `Stato inizializzato per utente ${deviceUUID} in chat ${commUUID}`
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
  getCommUUID() {
    return this.commUUID;
  }

  /**
   * Get my participant ID
   * @returns {string|null} My participant ID
   */
  getDeviceUUID() {
    return this.deviceUUID;
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
    this.commData = {};
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
    this.deviceUUID = null;
    this.commUUID = null;
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

  addPeerConnection(deviceUUID, peerConnection, commData) {
    this.peerConnections[deviceUUID] = peerConnection;

    // Initialize commData if it doesn't exist, otherwise preserve existing data
    if (!this.commData[deviceUUID]) {
      this.commData[deviceUUID] = {
        activeScreenShares: [],
        userData: {
          ...commData,
        },
      };
    } else {
      // Update existing userData while preserving other properties
      this.commData[deviceUUID].userData = {
        ...this.commData[deviceUUID].userData,
        ...commData,
      };
    }

    logger.debug("GlobalState", `Aggiunta peer connection per ${deviceUUID}`);
  }

  removePeerConnection(deviceUUID) {
    delete this.peerConnections[deviceUUID];
    delete this.commData[deviceUUID];
    delete this.negotiationInProgress[deviceUUID];
    logger.debug("GlobalState", `Rimossa peer connection per ${deviceUUID}`);
  }

  getPeerConnection(deviceUUID) {
    return this.peerConnections[deviceUUID];
  }

  getAllPeerConnections() {
    return { ...this.peerConnections };
  }

  getLocalStream() {
    return this.getActiveStream(this.deviceUUID, this.deviceUUID);
  }

  setLocalStream(localStream) {
    this.addActiveStream(this.deviceUUID, this.deviceUUID, localStream);
  }

  getAllLocalActiveStreams() {
    return this.getAllUserActiveStreams(this.getDeviceUUID());
  }

  getAllScreenStreams() {
    const deviceUUID = this.getDeviceUUID();
    const myStreams = this.activeStreams[deviceUUID] || {};

    // Create a copy without the stream that has UUID equal to deviceUUID
    const filteredStreams = Object.fromEntries(
      Object.entries(myStreams).filter(
        ([streamUUID]) => streamUUID !== deviceUUID
      )
    );

    return filteredStreams;
  }

  getAllActiveStreams() {
    return { ...this.activeStreams };
  }

  setNegotiationInProgress(deviceUUID, isInProgress) {
    this.negotiationInProgress[deviceUUID] = isInProgress;
    logger.debug(
      "GlobalState",
      `Negotiation in progress per ${deviceUUID}: ${isInProgress}`
    );
  }
  isNegotiationInProgress(deviceUUID) {
    return this.negotiationInProgress[deviceUUID] || false;
  }

  /**
   * Atomic check and set for negotiation state to prevent race conditions
   * @param {string} deviceUUID - ID del partecipante
   * @returns {boolean} - true if negotiation was successfully set, false if already in progress
   */
  trySetNegotiationInProgress(deviceUUID) {
    if (this.negotiationInProgress[deviceUUID]) {
      return false; // Already in progress
    }
    this.negotiationInProgress[deviceUUID] = true;
    logger.debug("GlobalState", `Atomic negotiation set for ${deviceUUID}`);
    return true;
  }

  // ===== METODI PER STREAM =====

  addActiveStream(deviceUUID, streamUUID, stream) {
    if (!this.activeStreams[deviceUUID]) {
      this.activeStreams[deviceUUID] = {};
    }
    this.activeStreams[deviceUUID][streamUUID] = stream;
    logger.debug(
      "GlobalState",
      `Active stream aggiunto per ${deviceUUID}: ${streamUUID}`
    );
  }
  getActiveStream(deviceUUID, streamUUID) {
    const activeStreams = this.activeStreams[deviceUUID];
    if (!activeStreams) {
      logger.debug(
        "GlobalState",
        `Nessun active stream trovato per ${deviceUUID}`
      );
      return null;
    }
    return activeStreams[streamUUID];
  }

  getAllUserActiveStreams(deviceUUID) {
    if (!this.activeStreams[deviceUUID]) {
      logger.debug(
        "GlobalState",
        `Nessun active stream trovato per ${deviceUUID}`
      );
      return {};
    }
    return { ...this.activeStreams[deviceUUID] };
  }

  removeAllUserActiveStreams(deviceUUID) {
    if (this.activeStreams[deviceUUID]) {
      delete this.activeStreams[deviceUUID];
      logger.debug(
        "GlobalState",
        `Tutti gli active streams rimossi per ${deviceUUID}`
      );
    }
  }

  setWebcamStatus(deviceUUID, status) {
    if (!this.commData[deviceUUID]) {
      this.commData[deviceUUID] = { userData: {} };
    }
    if (!this.commData[deviceUUID].userData) {
      this.commData[deviceUUID].userData = {};
    }
    this.commData[deviceUUID].userData.webcamOn = status;
    logger.debug(
      "GlobalState",
      `Webcam status inviato per ${deviceUUID}: ${status}`
    );
  }

  removeActiveStream(deviceUUID, streamUUID) {
    if (this.activeStreams[deviceUUID]) {
      delete this.activeStreams[deviceUUID][streamUUID];
      logger.debug(
        "GlobalState",
        `Active stream rimosso per ${deviceUUID}: ${streamUUID}`
      );

      // Remove participant entry if no more streams
      if (Object.keys(this.activeStreams[deviceUUID]).length === 0) {
        delete this.activeStreams[deviceUUID];
      }
    }
  }

  removeRemoteStream(deviceUUID) {
    delete this.remoteStreams[deviceUUID];
    logger.debug("GlobalState", `Remote stream rimosso per ${deviceUUID}`);
  }
  /**
   * Add screen share - supports both old and new signatures
   * addScreenShare(deviceUUID, screenShareUUID, stream) - adds to commData.activeScreenShares and screenStreams
   */
  addScreenShare(partecipantUUID, screenShareUUID, stream = null) {
    // Add to activeStreams
    this.addActiveStream(partecipantUUID, screenShareUUID, stream);

    // Add to commData activeScreenShares array
    if (!this.commData[partecipantUUID]) {
      this.commData[partecipantUUID] = {
        activeScreenShares: [],
        userData: {}, // Aggiunto per inizializzare userData
      };
    }

    // Assicurati che userData esista
    if (!this.commData[partecipantUUID].userData) {
      this.commData[partecipantUUID].userData = {};
    }

    // Add to activeScreenShares if not already present
    if (
      !this.commData[partecipantUUID].activeScreenShares.includes(
        screenShareUUID
      )
    ) {
      this.commData[partecipantUUID].activeScreenShares.push(screenShareUUID);
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
    // Remove from commData activeScreenShares array
    if (
      this.commData[partecipantUUID] &&
      Array.isArray(this.commData[partecipantUUID].activeScreenShares)
    ) {
      const index =
        this.commData[partecipantUUID].activeScreenShares.indexOf(
          screenShareUUID
        );
      if (index > -1) {
        this.commData[partecipantUUID].activeScreenShares.splice(index, 1);
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
   * @param {string} deviceUUID - Participant ID
   * @returns {Array<string>} Array of screen share stream IDs
   */
  getActiveScreenShares(deviceUUID) {
    if (
      !this.commData[deviceUUID] ||
      !Array.isArray(this.commData[deviceUUID].activeScreenShares)
    ) {
      return [];
    }
    return [...this.commData[deviceUUID].activeScreenShares];
  }

  isScreenShare(deviceUUID, streamUUID) {
    console.debug(
      "GlobalState",
      `Checking if stream ${streamUUID} is a screen share for participant ${deviceUUID}`
    );
    console.log("💞💞💕💕cuoricini", this.commData);
    // Check if the streamUUID exists in screenStreams
    if (!this.commData[deviceUUID]) return false;
    if (!Array.isArray(this.commData[deviceUUID].activeScreenShares))
      return false;
    return this.commData[deviceUUID].activeScreenShares.includes(streamUUID);
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
   * @param {string} deviceUUID - Participant ID
   * @returns {Object|null} Object containing screen streams or null
   */
  getRemoteScreenStreams(deviceUUID) {
    return this.remoteScreenStreams[deviceUUID] || null;
  }

  /**
   * Set remote screen streams for a participant
   * @param {string} deviceUUID - Participant ID
   * @param {Object} screenStreams - Object containing screen streams
   */
  setRemoteScreenStreams(deviceUUID, screenStreams) {
    this.remoteScreenStreams[deviceUUID] = screenStreams;
    logger.debug(
      "GlobalState",
      `Remote screen streams impostati per ${deviceUUID}`
    );
  }

  /**
   * Remove a specific remote screen stream
   * @param {string} deviceUUID - Participant ID
   * @param {string} screenShareUUID - Stream ID
   */
  removeRemoteScreenStream(deviceUUID, screenShareUUID) {
    if (
      this.remoteScreenStreams[deviceUUID] &&
      this.remoteScreenStreams[deviceUUID][screenShareUUID]
    ) {
      delete this.remoteScreenStreams[deviceUUID][screenShareUUID];
      logger.debug(
        "GlobalState",
        `Remote screen stream ${screenShareUUID} rimosso per ${deviceUUID}`
      );

      // Remove participant entry if no more streams
      if (Object.keys(this.remoteScreenStreams[deviceUUID]).length === 0) {
        delete this.remoteScreenStreams[deviceUUID];
      }
    }
  }

  // ===== STREAM METADATA METHODS =====

  /**
   * Set stream metadata for a participant
   * @param {string} deviceUUID - Participant ID
   * @param {string} screenShareUUID - Stream ID
   * @param {string} streamType - Stream type ('webcam' or 'screenshare')
   */
  setStreamMetadata(deviceUUID, screenShareUUID, streamType) {
    if (!this.remoteStreamMetadata[deviceUUID]) {
      this.remoteStreamMetadata[deviceUUID] = {};
    }
    this.remoteStreamMetadata[deviceUUID][screenShareUUID] = streamType;
    logger.debug(
      "GlobalState",
      `Stream metadata impostato: ${deviceUUID}/${screenShareUUID} = ${streamType}`
    );
  }

  /**
   * Get stream metadata for a participant
   * @param {string} deviceUUID - Participant ID
   * @returns {Object|null} Stream metadata object or null
   */
  getStreamMetadata(deviceUUID) {
    return this.remoteStreamMetadata[deviceUUID] || null;
  }

  /**
   * Remove stream metadata for a participant
   * @param {string} deviceUUID - Participant ID
   * @param {string} screenShareUUID - Stream ID
   */
  removeStreamMetadata(deviceUUID, screenShareUUID) {
    if (
      this.remoteStreamMetadata[deviceUUID] &&
      this.remoteStreamMetadata[deviceUUID][screenShareUUID]
    ) {
      delete this.remoteStreamMetadata[deviceUUID][screenShareUUID];
      logger.debug(
        "GlobalState",
        `Stream metadata rimosso: ${deviceUUID}/${screenShareUUID}`
      );

      // Remove participant entry if no more metadata
      if (Object.keys(this.remoteStreamMetadata[deviceUUID]).length === 0) {
        delete this.remoteStreamMetadata[deviceUUID];
      }
    }
  }

  /**
   * Remove all stream metadata for a participant (overloaded version)
   * @param {string} deviceUUID - Participant ID
   */
  removeAllStreamMetadata(deviceUUID) {
    if (this.remoteStreamMetadata[deviceUUID]) {
      delete this.remoteStreamMetadata[deviceUUID];
      logger.debug(
        "GlobalState",
        `All stream metadata rimosso per ${deviceUUID}`
      );
    }
  }

  /**
   * Remove all remote screen streams for a participant
   * @param {string} deviceUUID - Participant ID
   */
  removeAllRemoteScreenStreams(deviceUUID) {
    if (this.remoteScreenStreams[deviceUUID]) {
      delete this.remoteScreenStreams[deviceUUID];
      logger.debug(
        "GlobalState",
        `All remote screen streams rimossi per ${deviceUUID}`
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

    // Update commData if exists - isSpeaking is now inside userData
    if (this.commData[partecipantUUID]) {
      if (!this.commData[partecipantUUID].userData) {
        this.commData[partecipantUUID].userData = {};
      }
      this.commData[partecipantUUID].userData.isSpeaking = isSpeaking;
    }

    logger.verbose(
      "GlobalState",
      `User ${partecipantUUID} speaking: ${isSpeaking}`
    );
  }

  isUserSpeaking(partecipantUUID) {
    // Check both speakingUsers set and commData for consistency
    const isInSet = this.speakingUsers.has(partecipantUUID);
    const isInCommsData =
      this.commData[partecipantUUID]?.userData?.isSpeaking || false;

    // Return true if either source indicates the user is speaking
    return isInSet || isInCommsData;
  }

  getSpeakingUsers() {
    // Get users from both sources and merge them
    const fromSet = Array.from(this.speakingUsers);
    const fromCommsData = Object.keys(this.commData).filter(
      (partecipantUUID) => this.commData[partecipantUUID]?.userData?.isSpeaking
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
  initializeConnectionTracking(deviceUUID) {
    this.connectionStates[deviceUUID] = "connecting";
    this.connectionTimestamps[deviceUUID] = {
      initialized: Date.now(),
      lastSignalingTransition: null,
    };
    this.reconnectionAttempts[deviceUUID] = 0;
    this.lastKnownGoodStates[deviceUUID] = null;
    this.iceCandidateQueues[deviceUUID] = [];
    logger.debug(
      "GlobalState",
      `Connection tracking inizializzato per ${deviceUUID}`
    );
  }

  forceReloadStreams(deviceUUID) {
    // Clear all active streams for the participant
    if (this.activeStreams[deviceUUID]) {
      Object.keys(this.activeStreams[deviceUUID]).forEach((streamUUID) => {
        EventEmitter.sendLocalUpdateNeeded(
          deviceUUID,
          streamUUID,
          this.activeStreams[deviceUUID][streamUUID],
          "add_or_update"
        );
      });
      logger.debug(
        "GlobalState",
        `Tutti gli active streams sono stati riaggiornati per ${deviceUUID}`
      );
    }
  }

  clearConnectionTracking(deviceUUID) {
    delete this.connectionStates[deviceUUID];
    delete this.connectionTimestamps[deviceUUID];
    delete this.reconnectionAttempts[deviceUUID];
    delete this.lastKnownGoodStates[deviceUUID];
    delete this.iceCandidateQueues[deviceUUID];

    // Clear timeouts and intervals
    if (this.reconnectionTimeouts[deviceUUID]) {
      clearTimeout(this.reconnectionTimeouts[deviceUUID]);
      delete this.reconnectionTimeouts[deviceUUID];
    }

    if (this.connectionHealthCheckers[deviceUUID]) {
      clearInterval(this.connectionHealthCheckers[deviceUUID]);
      delete this.connectionHealthCheckers[deviceUUID];
    }

    logger.debug("GlobalState", `Connection tracking pulito per ${deviceUUID}`);
  }

  // ===== METODI PER ICE CANDIDATE QUEUE =====

  /**
   * Get queued ICE candidates for a participant
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Array} Array of queued ICE candidates
   */
  getQueuedICECandidates(deviceUUID) {
    return this.iceCandidateQueues[deviceUUID] || [];
  }
  /**
   * Queue an ICE candidate for a participant with timestamp for ordered processing
   * @param {string} deviceUUID - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE da accodare
   */
  queueICECandidate(deviceUUID, candidate) {
    if (!this.iceCandidateQueues[deviceUUID]) {
      this.iceCandidateQueues[deviceUUID] = [];
    }

    // Add timestamp for ordered processing to prevent race conditions
    const queuedCandidate = {
      candidate,
      timestamp: Date.now(),
      processed: false,
    };

    this.iceCandidateQueues[deviceUUID].push(queuedCandidate);
    logger.debug(
      "GlobalState",
      `ICE candidate accodato per ${deviceUUID}. Coda: ${this.iceCandidateQueues[deviceUUID].length}`
    );
  }

  /**
   * Get queued ICE candidates for a participant in chronological order
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Array} Array of queued ICE candidates sorted by timestamp
   */
  getQueuedICECandidates(deviceUUID) {
    const queue = this.iceCandidateQueues[deviceUUID] || [];
    // Return only unprocessed candidates, sorted by timestamp
    return queue
      .filter((item) => !item.processed)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.candidate);
  }

  /**
   * Get all queued ICE candidate entries (with metadata) for a participant
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Array} Array of queued ICE candidate entries with metadata
   */
  getQueuedICECandidateEntries(deviceUUID) {
    return this.iceCandidateQueues[deviceUUID] || [];
  }

  /**
   * Mark an ICE candidate as processed to prevent duplicate processing
   * @param {string} deviceUUID - ID del partecipante
   * @param {RTCIceCandidate} candidate - Il candidato ICE da marcare come processato
   */
  markICECandidateAsProcessed(deviceUUID, candidate) {
    const queue = this.iceCandidateQueues[deviceUUID];
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
          `ICE candidate marcato come processato per ${deviceUUID}`
        );
      }
    }
  }
  /**
   * Clear all queued ICE candidates for a participant
   * @param {string} deviceUUID - ID del partecipante
   */
  clearQueuedICECandidates(deviceUUID) {
    if (this.iceCandidateQueues[deviceUUID]) {
      this.iceCandidateQueues[deviceUUID] = [];
      logger.debug(
        "GlobalState",
        `Coda ICE candidates pulita per ${deviceUUID}`
      );
    }
  }

  // ===== METODI PER TIMING SAFEGUARDS =====

  /**
   * Record signaling state transition timing
   * @param {string} deviceUUID - ID del partecipante
   * @param {string} fromState - Stato precedente
   * @param {string} toState - Nuovo stato
   */ recordSignalingStateTransition(deviceUUID, fromState, toState) {
    if (!this.connectionTimestamps[deviceUUID]) {
      this.connectionTimestamps[deviceUUID] = {
        initialized: Date.now(),
        lastSignalingTransition: null,
      };
    }

    // Handle legacy format where connectionTimestamps[deviceUUID] might be a number
    if (typeof this.connectionTimestamps[deviceUUID] === "number") {
      const legacyTimestamp = this.connectionTimestamps[deviceUUID];
      this.connectionTimestamps[deviceUUID] = {
        initialized: legacyTimestamp,
        lastSignalingTransition: null,
      };
    }

    const timestamp = Date.now();
    this.connectionTimestamps[deviceUUID].lastSignalingTransition = {
      fromState,
      toState,
      timestamp,
      transitionId: `${fromState}->${toState}-${timestamp}`,
    };

    logger.debug(
      "GlobalState",
      `Signaling state transition recorded for ${deviceUUID}: ${fromState} -> ${toState}`
    );
  }

  /**
   * Check if enough time has passed since last signaling state transition
   * @param {string} deviceUUID - ID del partecipante
   * @param {number} minIntervalMs - Intervallo minimo in millisecondi
   * @returns {boolean} true se è passato abbastanza tempo
   */
  canTransitionSignalingState(deviceUUID, minIntervalMs = 1000) {
    const timestamps = this.connectionTimestamps[deviceUUID];
    if (!timestamps || !timestamps.lastSignalingTransition) {
      return true;
    }

    const timeSinceLastTransition =
      Date.now() - timestamps.lastSignalingTransition.timestamp;
    return timeSinceLastTransition >= minIntervalMs;
  }

  /**
   * Get last signaling state transition info
   * @param {string} deviceUUID - ID del partecipante
   * @returns {Object|null} Info sulla last transition o null
   */
  getLastSignalingStateTransition(deviceUUID) {
    const timestamps = this.connectionTimestamps[deviceUUID];
    return timestamps ? timestamps.lastSignalingTransition : null;
  }

  // ===== METODI DI STATO E DIAGNOSTICA =====

  /**
   * Ottieni un report completo dello stato
   */
  getStateReport() {
    return {
      deviceUUID: this.deviceUUID,
      commUUID: this.commUUID,
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
      deviceUUID: this.deviceUUID,
      commUUID: this.commUUID,

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
  async regenerate(deviceUUID, commUUID, stream = null) {
    // Clean up existing state (preserve audioContextRef during cleanup)
    this.cleanup(true);
    // Set new core values
    this.deviceUUID = deviceUUID;
    this.commUUID = commUUID;

    this.setLocalStream(stream);

    logger.info(
      "GlobalState",
      `Global state regenerated for user ${deviceUUID} in chat ${commUUID}`
    );
  }

  // ===== ICE TIMEOUT MANAGEMENT =====

  /**
   * Set ICE gathering timeout for a participant
   * @param {string} deviceUUID - ID del partecipante
   * @param {number} timeoutId - ID del timeout
   */
  setICEGatheringTimeout(deviceUUID, timeoutId) {
    if (!this.iceGatheringTimeouts) {
      this.iceGatheringTimeouts = {};
    }
    this.iceGatheringTimeouts[deviceUUID] = timeoutId;
  }

  /**
   * Get ICE gathering timeout for a participant
   * @param {string} deviceUUID - ID del partecipante
   * @returns {number|null} ID del timeout o null
   */
  getICEGatheringTimeout(deviceUUID) {
    return this.iceGatheringTimeouts?.[deviceUUID] || null;
  }

  /**
   * Clear ICE gathering timeout for a participant
   * @param {string} deviceUUID - ID del partecipante
   */
  clearICEGatheringTimeout(deviceUUID) {
    if (this.iceGatheringTimeouts?.[deviceUUID]) {
      delete this.iceGatheringTimeouts[deviceUUID];
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

  setCommData(commData) {
    // Set commData for all participants
    this.commData = commData;
    logger.debug("GlobalState", "Comms data updated for all participants");
  }

  getCommsData(deviceUUID = null) {
    // Placeholder for comms data, to be implemented when needed
    if (deviceUUID === null) {
      return { ...this.commData };
    }
    return this.commData[deviceUUID];
  }

  getActiveStreams(deviceUUID) {
    return this.activeStreams[deviceUUID] || null;
  }

  /**
   * Get local stream
   * @returns {MediaStream|null} Local stream or null
   */
  getLocalStream() {
    return this.getActiveStream(this.deviceUUID, this.deviceUUID) || null;
  }

  /**
   * Get remote stream for a participant
   * @param {string} deviceUUID - Participant ID
   * @returns {MediaStream|null} Remote stream or null
   */
  getRemoteStream(deviceUUID) {
    return this.remoteStreams[deviceUUID] || null;
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
  getgateway() {
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
