
/**
 * WebRTC Multi-Peer Connection Manager with Enhanced Stability and Reconnection Policy
 * 
 * RECONNECTION POLICY:
 * - Maximum 3 reconnection attempts per participant
 * - Exponential backoff: 2s, 4s, 8s delays between attempts  
 * - Three-tier recovery strategy:
 *   1. ICE Restart (attempt 1)
 *   2. SDP Renegotiation (attempt 2) 
 *   3. Complete Connection Recreation (attempt 3)
 * 
 * HEALTH MONITORING:
 * - Continuous health checks every 5 seconds
 * - Automatic detection of problematic connection states
 * - Smart recovery triggering based on connection age and state
 * 
 * ERROR HANDLING:
 * - Comprehensive error logging with detailed failure analysis
 * - Connection statistics and debugging information
 * - Manual recovery methods for testing and UI integration
 * 
 * After 3 failed attempts, the connection is permanently marked as failed
 * and detailed error information is logged to the console.
 */

import WebSocketMethods from "./webSocketMethods";
import { Platform } from "react-native";
import eventEmitter from "./EventEmitter";
import voiceActivityDetection from "./voiceActivityDetection";

// web implementation
let WebRTC;

if (Platform.OS === "web") {
  // Use react-native-webrtc-web-shim for web
  WebRTC = require("react-native-webrtc-web-shim");
} else {
  // Use react-native-webrtc for mobile
  WebRTC = require("react-native-webrtc");
}

const RTCPeerConnection = WebRTC.RTCPeerConnection;
const RTCIceCandidate = WebRTC.RTCIceCandidate;
const RTCSessionDescription = WebRTC.RTCSessionDescription;
const mediaDevices = WebRTC.mediaDevices;
const MediaStream = WebRTC.MediaStream;

const configuration = {
  iceServers: [
    {
      urls: "stun:oracle.israiken.it:3478",
      username: "test",
      credential: "test",
    },
    {
      urls: "turn:oracle.israiken.it:3478",
      username: "test",
      credential: "test",
    },
    // Add fallback public STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10, // Pre-gather ICE candidates
  sdpSemantics: "unified-plan",
};

class MultiPeerWebRTCManager {
  myId = null; // Identificativo univoco per questo client (dovrebbe essere assegnato dal server/login)
  chatId = null; // Identifico la chat in cui mi trovo
  peerConnections = {}; // Oggetto per memorizzare le connessioni: { participantId: RTCPeerConnection }
  userData = {};
  localStream = null;
  remoteStreams = {}; // Oggetto per memorizzare gli stream remoti: { participantId: MediaStream }

  // Voice Activity Detection
  speakingUsers = new Set(); // Track who is currently speaking
  onSpeakingStatusChange = null; // Callback for UI updates

  // --- Callback UI aggiornate ---
  onLocalStreamReady = null;
  // Chiamata quando un nuovo stream remoto viene aggiunto o uno esistente viene aggiornato
  onRemoteStreamAddedOrUpdated = null;
  // Chiamata quando lo stato di una specifica connessione peer cambia
  onPeerConnectionStateChange = null;
  // Chiamata quando un partecipante lascia (la sua connessione viene chiusa)
  onParticipantLeft = null;
  onStreamUpdate = null;

  // ===== STABILITÀ E RICONNESSIONE =====
  // Connection stability and reconnection management
  connectionStates = {}; // Track connection states per peer
  connectionTimestamps = {}; // Track connection attempt timestamps
  reconnectionAttempts = {}; // Track number of reconnection attempts per peer (MAX 3)
  reconnectionTimeouts = {}; // Track reconnection timeouts
  connectionHealthCheckers = {}; // Health check intervals per connection
  lastKnownGoodStates = {}; // Track last known good connection states
  iceCandidateQueues = {}; // Queue ICE candidates for early-arriving candidates
    // Constants for reconnection policy
  MAX_RECONNECTION_ATTEMPTS = 3; // Massimo 3 tentativi come richiesto
  RECONNECTION_BASE_DELAY = 2000; // 2 secondi delay base
  HEALTH_CHECK_INTERVAL = 5000; // 5 secondi per health check
  CONNECTION_TIMEOUT = 30000; // 30 secondi timeout per tentativi di connessione
  STABILIZATION_TIMEOUT = 15000; // 15 secondi per stabilizzazione connessione

  // Aggiungi una proprietà per tracciare le rinegoziazioni in corso
  constructor(
    myId = null,
    chatId = null,
    onLocalStreamReady = null,
    onRemoteStreamAddedOrUpdated = null,
    onPeerConnectionStateChange = null,
    onParticipantLeft = null
  ) {
    if (myId) {
      console.log(`MultiPeerWebRTCManager: Inizializzato per l'utente ${myId}`);
      if (!myId) {
        throw new Error("ID utente richiesto.");
      }
      this.myId = myId;
      this.chatId = chatId;
      this.onLocalStreamReady = onLocalStreamReady;
      this.onRemoteStreamAddedOrUpdated = onRemoteStreamAddedOrUpdated;
      this.onPeerConnectionStateChange = onPeerConnectionStateChange;
      this.onParticipantLeft = onParticipantLeft;
      this._setupEventListeners();
    } else {
      console.log("MultiPeerWebRTCManager: Inizializzato vuoto");
    }
    this.negotiationInProgress = {}; // Traccia rinegoziazioni per peer
  }

  // Gestione degli eventi
  _setupEventListeners() {
    // Rimuovi eventuali listener precedenti
    this._removeEventListeners();
    
    // Aggiungi i listener per i vari tipi di messaggi
    eventEmitter.on('offer', this.offerMessage.bind(this));
    eventEmitter.on('answer', this.answerMessage.bind(this));
    eventEmitter.on('candidate', this.candidateMessage.bind(this));
    
    // Add speaking status listeners
    eventEmitter.on('speaking', this.handleRemoteSpeaking.bind(this));
    eventEmitter.on('not_speaking', this.handleRemoteNotSpeaking.bind(this));
    
    console.log('MultiPeerWebRTCManager: Event listeners configurati');
  }

  // Metodo per rimuovere gli event listeners
  _removeEventListeners() {
    eventEmitter.off('offer', this.offerMessage.bind(this));
    eventEmitter.off('answer', this.answerMessage.bind(this));
    eventEmitter.off('candidate', this.candidateMessage.bind(this));
    eventEmitter.off('speaking', this.handleRemoteSpeaking.bind(this));
    eventEmitter.off('not_speaking', this.handleRemoteNotSpeaking.bind(this));
  }


  /**
   * Inizia l'acquisizione dello stream locale (invariato)
   */
  async startLocalStream(audioOnly = true) {
    console.log("MultiPeerWebRTCManager: Richiesta stream locale...");
    if (this.localStream) {
      console.log("MultiPeerWebRTCManager: Stream locale già attivo.");
      return this.localStream;
    }
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: audioOnly ? false : {
          facingMode: "user",
          width: 1920,
          height: 1080,
        },
      };      const stream = await mediaDevices.getUserMedia(constraints);
      console.log("MultiPeerWebRTCManager: Stream locale ottenuto.");
      this.localStream = stream;
      if (this.onLocalStreamReady) {
        this.onLocalStreamReady(stream);      }
      
      // Se ci sono già connessioni peer attive, aggiungi lo stream a tutte
      Object.values(this.peerConnections).forEach((pc) => {
        this._addLocalTracksToPeerConnection(pc);
      });
      return stream;
    } catch (error) {
      console.error(
        "MultiPeerWebRTCManager: Errore ottenendo stream locale:",
        error
      );
      throw error; // Rilancia l'errore per gestione esterna se necessario
    }
  }

  /**
   * Metodo per notificare cambio stream ai componenti UI
   */
  notifyStreamUpdate() {
    if (this.onStreamUpdate) {
      this.onStreamUpdate();
    }
  }
  /**
   * Initialize voice activity detection for local stream
   */
  async initializeVoiceActivityDetection() {
    console.log('Attempting to initialize VAD...', {
      hasLocalStream: !!this.localStream,
      chatId: this.chatId,
      myId: this.myId,
      platform: Platform.OS
    });

    if (!this.localStream || !this.chatId || !this.myId) {
      console.warn('Cannot initialize VAD: missing stream, chatId, or myId', {
        hasLocalStream: !!this.localStream,
        chatId: this.chatId,
        myId: this.myId
      });
      return false;
    }

    const success = await voiceActivityDetection.initialize(
      this.localStream,
      this.chatId,
      this.myId,
      (userId, isSpeaking) => {
        this.handleSpeakingStatusChange(userId, isSpeaking);
      }
    );

    if (success) {
      voiceActivityDetection.start();
      console.log(`Voice Activity Detection initialized and started successfully for ${Platform.OS}`);
      
      // For mobile platforms, add a test trigger after initialization
      if (Platform.OS !== 'web') {
        setTimeout(() => {
          console.log('Testing mobile VAD with manual trigger...');
          voiceActivityDetection.triggerMobileSpeaking(1500);
        }, 3000);
      }
    } else {
      console.error('Failed to initialize Voice Activity Detection');
    }

    return success;
  }

  /**
   * Handle speaking status changes (both local and remote)
   */
  handleSpeakingStatusChange(userId, isSpeaking) {
    if (isSpeaking) {
      this.speakingUsers.add(userId);
    } else {
      this.speakingUsers.delete(userId);
    }

    // Notify UI callback if set
    if (this.onSpeakingStatusChange) {
      this.onSpeakingStatusChange(userId, isSpeaking);
    }
  }

  /**
   * Check if a user is currently speaking
   */
  isUserSpeaking(userId) {
    return this.speakingUsers.has(userId);
  }

  /**
   * Get all currently speaking users
   */
  getSpeakingUsers() {
    return Array.from(this.speakingUsers);
  }
  /**
   * Stop voice activity detection
   */
  stopVoiceActivityDetection() {
    voiceActivityDetection.cleanup();
    this.speakingUsers.clear();
  }

  /**
   * Handle remote user speaking events
   */
  handleRemoteSpeaking(data) {
    const userId = data.from || data.id;
    if (userId && userId !== this.myId) {
      this.handleSpeakingStatusChange(userId, true);
    }
  }

  /**
   * Handle remote user not speaking events
   */
  handleRemoteNotSpeaking(data) {
    const userId = data.from || data.id;
    if (userId && userId !== this.myId) {
      this.handleSpeakingStatusChange(userId, false);
    }
  }

  /**
   * Crea e configura una RTCPeerConnection PER UN SINGOLO PARTECIPANTE REMOTO.
   * @param {string} participantId - L'ID univoco del partecipante remoto.
   * @returns {RTCPeerConnection} La connessione creata.
   */  createPeerConnection(participant) {
    const participantId = participant.from;

    if (this.peerConnections[participantId]) {
      console.warn(
        `MultiPeerWebRTCManager: Connessione peer per ${participantId} esiste già.`
      );
      return this.peerConnections[participantId];
    }

    console.log(
      `MultiPeerWebRTCManager: Creazione PeerConnection per ${participantId}...`
    );
    try {
      const pc = new RTCPeerConnection(configuration);
      const userData = { handle: participant.handle, from: participantId };
      this.peerConnections[participantId] = pc; // Memorizza la connessione
      this.userData[participantId] = userData;
      
      // Initialize connection stability tracking
      this._initializeConnectionTracking(participantId);
      this._reportConnectionEvent(participantId, 'peer_connection_created');

      // --- Gestione Eventi Specifica per questa Connessione ---

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Invia il candidato SPECIFICATAMENTE a questo partecipante
          console.log(
            `[WebRTC ICE] Invio candidato ICE a ${participantId}`
          );
          this._reportConnectionEvent(participantId, 'ice_candidate_sent', {
            type: event.candidate.type,
            protocol: event.candidate.protocol
          });
          
          await WebSocketMethods.IceCandidate({
            candidate: event.candidate.toJSON(),
            to: participantId,
            from: this.myId,
          });
        } else {
          console.log(`[WebRTC ICE] ICE gathering completato per ${participantId}`);
          this._reportConnectionEvent(participantId, 'ice_gathering_complete');
        }
      };

      // In webrtcMethods.js, inside createPeerConnection method
      pc.ontrack = (event) => {
        console.log(
          `[WebRTC Track] Ricevuta track remota da ${participantId}:`,
          event.track.kind
        );
        this._reportConnectionEvent(participantId, 'remote_track_received', { kind: event.track.kind });

        // Usa un MediaStream esistente o creane uno nuovo
        if (!this.remoteStreams[participantId]) {
          this.remoteStreams[participantId] = new MediaStream();
        }

        // Aggiungi la traccia allo stream esistente
        const stream = this.remoteStreams[participantId];
        stream.addTrack(event.track);

        // Notifica solo quando riceviamo sia audio che video (o uno dei due se è tutto ciò che ci aspettiamo)
        if (this.onRemoteStreamAddedOrUpdated) {
          this.onRemoteStreamAddedOrUpdated(participantId, stream);
        }
        
        this.notifyStreamUpdate();

        event.track.onended = () => {
          this.notifyStreamUpdate();
          this._reportConnectionEvent(participantId, 'remote_track_ended', { kind: event.track.kind });
        };

        event.track.onmute = () => {
          this.notifyStreamUpdate();
        };

        event.track.onunmute = () => {
          this.notifyStreamUpdate();
        };
      };

      pc.oniceconnectionstatechange = (event) => {
        const newState = pc.iceConnectionState;
        console.log(
          `[WebRTC State] ICE connection state for ${participantId}: ${newState}`
        );
        
        this._reportConnectionEvent(participantId, `ice_connection_state_${newState}`);
        this._logConnectionDebugInfo(participantId, 'ice_state_change');

        if (this.onPeerConnectionStateChange) {
          this.onPeerConnectionStateChange(participantId, newState);
        }

        // Enhanced state handling with recovery
        switch (newState) {
          case "connected":
          case "completed":
            console.log(`[WebRTC State] ✅ Connection to ${participantId} established successfully`);
            this._reportConnectionEvent(participantId, 'connection_established_successfully');
            break;

          case "failed":
            console.warn(`[WebRTC State] ❌ Connection to ${participantId} failed`);
            this._reportConnectionEvent(participantId, 'connection_failed');
            // Trigger automatic recovery
            this._attemptConnectionRecovery(participantId);
            break;

          case "disconnected":
            console.warn(`[WebRTC State] ⚠️ Connection to ${participantId} disconnected`);
            this._reportConnectionEvent(participantId, 'connection_disconnected');
            // Give some time for self-recovery before attempting manual recovery
            setTimeout(() => {
              if (pc.iceConnectionState === "disconnected") {
                console.warn(`[WebRTC State] Connection to ${participantId} still disconnected after 5s, attempting recovery`);
                this._attemptConnectionRecovery(participantId);
              }
            }, 5000);
            break;
            
          case "checking":
            console.log(`[WebRTC State] 🔄 Connection to ${participantId} checking...`);
            this._reportConnectionEvent(participantId, 'connection_checking');
            break;
            
          case "new":
            console.log(`[WebRTC State] 🆕 New connection to ${participantId}`);
            this._reportConnectionEvent(participantId, 'connection_new');
            break;
        }
      };

      // Additional connection state monitoring
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[WebRTC State] Overall connection state for ${participantId}: ${state}`);
        this._reportConnectionEvent(participantId, `connection_state_${state}`);
        
        if (state === 'failed') {
          this._attemptConnectionRecovery(participantId);
        }
      };

      // Signaling state monitoring
      pc.onsignalingstatechange = () => {
        const state = pc.signalingState;
        console.log(`[WebRTC State] Signaling state for ${participantId}: ${state}`);
        this._reportConnectionEvent(participantId, `signaling_state_${state}`);
      };

      // ICE gathering state monitoring
      pc.onicegatheringstatechange = () => {
        const state = pc.iceGatheringState;
        console.log(`[WebRTC State] ICE gathering state for ${participantId}: ${state}`);
        this._reportConnectionEvent(participantId, `ice_gathering_state_${state}`);
      };

      // Aggiungi lo stream locale a QUESTA specifica connessione peer
      if (this.localStream) {
        this._addLocalTracksToPeerConnection(pc);
        this._reportConnectionEvent(participantId, 'local_tracks_added');
      } else {
        console.warn(
          `MultiPeerWebRTCManager: Attenzione - PeerConnection per ${participantId} creata senza stream locale pronto.`
        );
        this._reportConnectionEvent(participantId, 'created_without_local_stream');
      }

      console.log(
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} creata con sistema di stabilità.`
      );
      return pc;
    } catch (error) {
      console.error(
        `MultiPeerWebRTCManager: Errore creazione PeerConnection per ${participantId}:`,
        error
      );
      this._reportConnectionEvent(participantId, 'peer_connection_creation_failed', error.message);
      delete this.peerConnections[participantId]; // Rimuovi la connessione fallita
      this._clearConnectionTracking(participantId); // Clean up tracking
      return null;
    }
  }

  // aggiunge una video track allo stream
  async addVideoTrack() {
    try {
      const videoStream = await mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 },
          facingMode: 'user'
        }
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      
      if (this.localStream && videoTrack) {
        this.localStream.addTrack(videoTrack);
        
        // Aggiungi la traccia a tutte le peer connections attive
        for (const [peerId, pc] of Object.entries(this.peerConnections)) {
          if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
            try {
              await pc.addTrack(videoTrack, this.localStream);
            } catch (error) {
              console.error(`Error adding video track to peer ${peerId}:`, error);
            }
          }
        }
        
        if (this.onLocalStreamReady) {
          this.onLocalStreamReady(this.localStream);
        }
        this.notifyStreamUpdate();
        
        // Aspetta un momento prima di rinegoziare
        setTimeout(async () => {
          await this.renegotiateWithAllPeers();
        }, 100);
        
        return videoTrack;
      }
    } catch (error) {
      console.error("Error adding video track:", error);
      throw error;
    }
  }

  /**
   * Rimuove tutte le tracce video dal local stream
   */
  async removeVideoTracks() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      
      // Ferma e rimuovi le tracce dal local stream
      videoTracks.forEach(track => {
        track.stop();
        this.localStream.removeTrack(track);
      });

      // Rimuovi i sender dalle peer connections
      for (const [peerId, pc] of Object.entries(this.peerConnections)) {
        if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
          const senders = pc.getSenders();
          for (const sender of senders) {
            if (sender.track && sender.track.kind === 'video') {
              try {
                await pc.removeTrack(sender);
              } catch (error) {
                console.error(`Error removing video track from peer ${peerId}:`, error);
              }
            }
          }
        }
      }

      if (this.onLocalStreamReady) {
        this.onLocalStreamReady(this.localStream);
      }
      this.notifyStreamUpdate();
      
      // Aspetta un momento prima di rinegoziare
      setTimeout(async () => {
        await this.renegotiateWithAllPeers();
      }, 100);
    }
  }

  /**
   * Rinegozia con tutti i peer attivi
   */
  async renegotiateWithAllPeers() {
    for (const peerId of Object.keys(this.peerConnections)) {
      await this.createOffer(peerId);
    }
  }

  /**
   * Crea un'offerta SDP per un partecipante specifico.
   */
  async createOffer(participantId) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.warn(`No peer connection found for ${participantId}`);
      return;
    }

    // Evita rinegoziazioni multiple simultanee
    if (this.negotiationInProgress[participantId]) {
      console.log(`Negotiation already in progress for ${participantId}`);
      return;
    }

    try {
      this.negotiationInProgress[participantId] = true;
      
      console.log(`Creating offer for ${participantId}...`);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false
      });
      
      console.log(`Setting local description for ${participantId}...`);
      await pc.setLocalDescription(offer);

      await WebSocketMethods.RTCOffer({
        offer: offer.toJSON ? offer.toJSON() : offer,
        to: participantId,
        from: this.myId,
      });
      
    } catch (error) {
      console.error(`Error creating offer for ${participantId}:`, error);
    } finally {
      // Rimuovi il flag dopo un timeout per evitare deadlock
      setTimeout(() => {
        this.negotiationInProgress[participantId] = false;
      }, 3000);
    }
  }

  /**
   * Gestisce la ricezione di un'offerta da un partecipante remoto.
   */
  async handleOffer(participantId, offer) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.warn(`No peer connection found for ${participantId} when handling offer`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await WebSocketMethods.RTCAnswer({
        answer: answer.toJSON ? answer.toJSON() : answer,
        to: participantId,
        from: this.myId,
      });
      
    } catch (error) {
      console.error(`Error handling offer from ${participantId}:`, error);
    }
  }

  /**
   * Gestisce la ricezione di una risposta da un partecipante remoto.
   */
  async handleAnswer(participantId, answer) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.warn(`No peer connection found for ${participantId} when handling answer`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.negotiationInProgress[participantId] = false;
    } catch (error) {
      console.error(`Error handling answer from ${participantId}:`, error);
    }
  }

  /**
   * Helper per aggiungere tracce locali a una PeerConnection
   * @param {RTCPeerConnection} pc
   */
  _addLocalTracksToPeerConnection(pc) {
    if (!this.localStream) return;
    this.localStream.getTracks().forEach((track) => {
      // Evita duplicati
      const already = pc
        .getSenders()
        .find((s) => s.track && s.track.id === track.id);
      if (!already) {
        pc.addTrack(track, this.localStream);
      }
    });
  }
  /**
   * Helper per trovare l'ID partecipante data una PeerConnection (uso interno)
   * @param {RTCPeerConnection} pc
   * @returns {string | null}
   */
  _findParticipantIdByPeerConnection(pc) {
    return Object.keys(this.peerConnections).find(
      (id) => this.peerConnections[id] === pc
    );
  }

  // ===== METODI DI STABILITÀ E RICONNESSIONE =====

  /**
   * Inizializza il tracking della stabilità per un partecipante
   * @param {string} participantId 
   */
  _initializeConnectionTracking(participantId) {
    console.log(`[WebRTC Stability] Initializing connection tracking for ${participantId}`);
    
    this.connectionStates[participantId] = 'connecting';
    this.connectionTimestamps[participantId] = Date.now();
    this.reconnectionAttempts[participantId] = 0;
    this.lastKnownGoodStates[participantId] = null;
    this.iceCandidateQueues[participantId] = [];
    
    // Start health monitoring
    this._startConnectionHealthCheck(participantId);
  }

  /**
   * Registra eventi di connessione per debugging
   * @param {string} participantId 
   * @param {string} event 
   * @param {*} data 
   */
  _reportConnectionEvent(participantId, event, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[WebRTC Event] ${timestamp} - ${participantId}: ${event}`, data || '');
    
    // Update connection state
    if (event.includes('connected') || event.includes('completed')) {
      this.connectionStates[participantId] = 'connected';
      this.lastKnownGoodStates[participantId] = Date.now();
      this.reconnectionAttempts[participantId] = 0; // Reset attempts on success
    } else if (event.includes('failed') || event.includes('disconnected')) {
      this.connectionStates[participantId] = 'failed';
    }
  }

  /**
   * Registra informazioni dettagliate di debugging per una connessione
   * @param {string} participantId 
   * @param {string} context 
   */
  _logConnectionDebugInfo(participantId, context) {
    const pc = this.peerConnections[participantId];
    if (!pc) return;

    const debugInfo = {
      context,
      iceConnectionState: pc.iceConnectionState,
      connectionState: pc.connectionState,
      signalingState: pc.signalingState,
      iceGatheringState: pc.iceGatheringState,
      reconnectionAttempts: this.reconnectionAttempts[participantId] || 0,
      lastGoodConnection: this.lastKnownGoodStates[participantId],
      queuedCandidates: this.iceCandidateQueues[participantId]?.length || 0
    };

    console.log(`[WebRTC Debug] ${participantId}:`, debugInfo);
  }
  /**
   * Avvia il monitoraggio dello stato di salute per una connessione
   * @param {string} participantId 
   */
  _startConnectionHealthCheck(participantId) {
    // Clear any existing health checker
    this._stopConnectionHealthCheck(participantId);

    console.log(`[WebRTC Health] 🏥 Avvio monitoraggio sanitario per ${participantId}`);
    
    const healthChecker = setInterval(() => {
      const pc = this.peerConnections[participantId];
      if (!pc) {
        this._stopConnectionHealthCheck(participantId);
        return;
      }

      const currentTime = Date.now();
      const connectionAge = currentTime - (this.connectionTimestamps[participantId] || currentTime);
      const timeSinceLastGood = this.lastKnownGoodStates[participantId] 
        ? currentTime - this.lastKnownGoodStates[participantId] 
        : connectionAge;

      this._logConnectionDebugInfo(participantId, 'health_check');

      // Enhanced health checks
      const isUnhealthy = (
        pc.iceConnectionState === 'disconnected' || 
        pc.iceConnectionState === 'failed' ||
        pc.connectionState === 'failed' ||
        (pc.iceConnectionState === 'checking' && connectionAge > 30000) || // Too long in checking state
        (timeSinceLastGood > 45000 && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') // Too long without good connection
      );

      if (isUnhealthy) {
        const reason = pc.iceConnectionState === 'failed' ? 'ICE_FAILED' :
                      pc.connectionState === 'failed' ? 'CONNECTION_FAILED' :
                      pc.iceConnectionState === 'disconnected' ? 'DISCONNECTED' :
                      connectionAge > 30000 ? 'STUCK_IN_CHECKING' : 'NO_GOOD_CONNECTION';
                      
        console.warn(`[WebRTC Health] 🚨 Problema di salute rilevato per ${participantId}: ${reason}`);
        console.warn(`[WebRTC Health] 📊 Statistiche: età=${Math.round(connectionAge/1000)}s, ultimoBuono=${Math.round(timeSinceLastGood/1000)}s`);
        
        this._reportConnectionEvent(participantId, 'health_issue_detected', { 
          reason, 
          connectionAge: Math.round(connectionAge/1000),
          timeSinceLastGood: Math.round(timeSinceLastGood/1000)
        });
        
        // Only trigger recovery if we haven't exceeded max attempts
        const currentAttempts = this.reconnectionAttempts[participantId] || 0;
        if (currentAttempts < this.MAX_RECONNECTION_ATTEMPTS) {
          this._attemptConnectionRecovery(participantId);
        } else {
          console.error(`[WebRTC Health] ⛔ Non avvio recupero per ${participantId}: tentativi esauriti (${currentAttempts}/${this.MAX_RECONNECTION_ATTEMPTS})`);
        }
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        // Connection is healthy - update last good state if it wasn't already recent
        if (!this.lastKnownGoodStates[participantId] || currentTime - this.lastKnownGoodStates[participantId] > 10000) {
          this.lastKnownGoodStates[participantId] = currentTime;
          console.log(`[WebRTC Health] ✅ Connessione salutare confermata per ${participantId}`);
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);

    this.connectionHealthCheckers[participantId] = healthChecker;
  }

  /**
   * Ferma il monitoraggio dello stato di salute per una connessione
   * @param {string} participantId 
   */
  _stopConnectionHealthCheck(participantId) {
    if (this.connectionHealthCheckers[participantId]) {
      clearInterval(this.connectionHealthCheckers[participantId]);
      delete this.connectionHealthCheckers[participantId];
      console.log(`[WebRTC Health] Stopped health monitoring for ${participantId}`);
    }
  }
  /**
   * Tentativo di recupero della connessione con politica di retry (MAX 3 tentativi)
   * @param {string} participantId 
   */
  async _attemptConnectionRecovery(participantId) {
    const currentAttempts = this.reconnectionAttempts[participantId] || 0;

    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      console.error(`[WebRTC Recovery] ERRORE CRITICO: Raggiunti ${this.MAX_RECONNECTION_ATTEMPTS} tentativi massimi per ${participantId}. Connessione definitivamente fallita.`);
      console.error(`[WebRTC Recovery] IMPOSSIBILE STABILIRE CONNESSIONE CON ${participantId} - Tutti i tentativi di riconnessione sono falliti`);
      this._handleConnectionFailure(participantId);
      return;
    }

    this.reconnectionAttempts[participantId] = currentAttempts + 1;
    const attempt = this.reconnectionAttempts[participantId];
    
    // Exponential backoff: 2s, 4s, 8s
    const delay = this.RECONNECTION_BASE_DELAY * Math.pow(2, attempt - 1);
    
    console.warn(`[WebRTC Recovery] 🔄 Tentativo ${attempt}/${this.MAX_RECONNECTION_ATTEMPTS} di riconnessione per ${participantId} in ${delay}ms`);
    console.warn(`[WebRTC Recovery] Strategia: ${attempt === 1 ? 'ICE Restart' : attempt === 2 ? 'Rinegoziazione' : 'Ricreazione connessione'}`);
    
    // Clear any existing timeout
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
    }

    // Report reconnection attempt to UI
    this._reportConnectionEvent(participantId, `reconnection_attempt_${attempt}`, { delay, strategy: attempt === 1 ? 'ice_restart' : attempt === 2 ? 'renegotiation' : 'recreation' });

    this.reconnectionTimeouts[participantId] = setTimeout(async () => {
      try {
        console.log(`[WebRTC Recovery] 🚀 Esecuzione tentativo ${attempt} per ${participantId}`);
        await this._performConnectionRecovery(participantId);
        
        // If we get here, recovery was successful
        console.log(`[WebRTC Recovery] ✅ Tentativo ${attempt} per ${participantId} completato con successo`);
        
      } catch (error) {
        console.error(`[WebRTC Recovery] ❌ Tentativo ${attempt} per ${participantId} fallito:`, error.message);
        
        // If this was not the last attempt, try again immediately
        if (attempt < this.MAX_RECONNECTION_ATTEMPTS) {
          console.warn(`[WebRTC Recovery] ⏭️ Preparazione tentativo successivo ${attempt + 1}/${this.MAX_RECONNECTION_ATTEMPTS} per ${participantId}`);
          setTimeout(() => {
            this._attemptConnectionRecovery(participantId);
          }, 500); // Short delay before next attempt
        } else {
          console.error(`[WebRTC Recovery] 💀 FALLIMENTO DEFINITIVO per ${participantId} dopo ${this.MAX_RECONNECTION_ATTEMPTS} tentativi`);
          this._handleConnectionFailure(participantId);
        }
      }
    }, delay);
  }
  /**
   * Esegue il recupero effettivo della connessione
   * @param {string} participantId 
   */
  async _performConnectionRecovery(participantId) {
    console.log(`[WebRTC Recovery] 🔧 Eseguendo recupero connessione per ${participantId}`);
    
    const pc = this.peerConnections[participantId];
    if (!pc) {
      throw new Error(`PeerConnection per ${participantId} non trovata durante il recupero`);
    }

    const currentAttempt = this.reconnectionAttempts[participantId];
    this._reportConnectionEvent(participantId, 'recovery_attempt_started', { attempt: currentAttempt });

    // Strategy 1: Try ICE restart first (attempt 1)
    if (currentAttempt === 1) {
      try {
        console.log(`[WebRTC Recovery] 🧊 Tentativo ICE restart per ${participantId} (tentativo ${currentAttempt})`);
        await this._performICERestart(participantId);
        
        // Wait for connection to stabilize
        await this._waitForConnectionStabilization(participantId, 10000);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log(`[WebRTC Recovery] ✅ ICE restart riuscito per ${participantId}`);
          this._reportConnectionEvent(participantId, 'recovery_ice_restart_success');
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error('ICE restart non ha migliorato la connessione');
      } catch (error) {
        console.warn(`[WebRTC Recovery] ⚠️ ICE restart fallito per ${participantId}:`, error.message);
        throw error;
      }
    }

    // Strategy 2: If ICE restart failed, try renegotiation (attempt 2)
    if (currentAttempt === 2) {
      try {
        console.log(`[WebRTC Recovery] 🔄 Tentativo rinegoziazione per ${participantId} (tentativo ${currentAttempt})`);
        await this._safeRenegotiate(participantId);
        
        await this._waitForConnectionStabilization(participantId, 10000);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log(`[WebRTC Recovery] ✅ Rinegoziazione riuscita per ${participantId}`);
          this._reportConnectionEvent(participantId, 'recovery_renegotiation_success');
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error('Rinegoziazione non ha migliorato la connessione');
      } catch (error) {
        console.warn(`[WebRTC Recovery] ⚠️ Rinegoziazione fallita per ${participantId}:`, error.message);
        throw error;
      }
    }

    // Strategy 3: Last resort - recreate connection completely (attempt 3)
    if (currentAttempt === 3) {
      try {
        console.log(`[WebRTC Recovery] 🆕 Tentativo ricreazione connessione per ${participantId} (tentativo ${currentAttempt})`);
        await this._recreateConnection(participantId);
        
        await this._waitForConnectionStabilization(participantId, 15000);
        
        const newPc = this.peerConnections[participantId];
        if (newPc && (newPc.iceConnectionState === 'connected' || newPc.iceConnectionState === 'completed')) {
          console.log(`[WebRTC Recovery] ✅ Ricreazione connessione riuscita per ${participantId}`);
          this._reportConnectionEvent(participantId, 'recovery_recreation_success');
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error('Ricreazione connessione non è riuscita');
      } catch (error) {
        console.error(`[WebRTC Recovery] ❌ Ricreazione connessione fallita per ${participantId}:`, error.message);
        throw error;
      }
    }

    // If we get here, all strategies failed
    throw new Error(`Tutte le strategie di recupero fallite per ${participantId} (tentativo ${currentAttempt})`);
  }

  /**
   * Esegue un ICE restart
   * @param {string} participantId 
   */
  async _performICERestart(participantId) {
    const pc = this.peerConnections[participantId];
    if (!pc) throw new Error(`PeerConnection per ${participantId} non trovata`);

    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    
    await WebSocketMethods.RTCOffer({
      sdp: pc.localDescription.sdp,
      to: participantId,
      from: this.myId,
    });
    
    console.log(`[WebRTC Recovery] ICE restart offer inviato per ${participantId}`);
  }
  /**
   * Rinegoziazione sicura per evitare collisioni
   * @param {string} participantId 
   */
  async _safeRenegotiate(participantId) {
    // Avoid multiple simultaneous negotiations
    if (this.negotiationInProgress[participantId]) {
      console.log(`[WebRTC Recovery] Rinegoziazione già in corso per ${participantId}`);
      return;
    }

    try {
      this.negotiationInProgress[participantId] = true;
      await this.createOffer(participantId);
    } finally {
      // Clear negotiation flag after timeout to prevent deadlock
      setTimeout(() => {
        this.negotiationInProgress[participantId] = false;
      }, 10000);
    }
  }

  /**
   * Ricrea completamente la connessione come ultima risorsa
   * @param {string} participantId 
   */
  async _recreateConnection(participantId) {
    console.log(`[WebRTC Recovery] 🔨 Ricreazione completa connessione per ${participantId}`);
    
    // Store user data before destroying connection
    const userData = this.userData[participantId];
    if (!userData) {
      throw new Error(`Dati utente per ${participantId} non trovati per la ricreazione`);
    }

    // Clean up existing connection completely
    const oldPc = this.peerConnections[participantId];
    if (oldPc) {
      oldPc.close();
    }
    
    // Clean up tracking for old connection
    this._clearConnectionTracking(participantId);
    
    // Remove from peer connections
    delete this.peerConnections[participantId];
    delete this.userData[participantId];
    
    // Remove remote stream
    if (this.remoteStreams[participantId]) {
      this.remoteStreams[participantId].getTracks().forEach(track => track.stop());
      delete this.remoteStreams[participantId];
    }
    
    console.log(`[WebRTC Recovery] 🧹 Pulizia completata per ${participantId}, ricreazione in corso...`);
    
    // Wait a moment before recreating
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Recreate the connection with stored user data
    const newPc = this.createPeerConnection(userData);
    if (!newPc) {
      throw new Error(`Impossibile ricreare PeerConnection per ${participantId}`);
    }
    
    console.log(`[WebRTC Recovery] 🆕 Nuova PeerConnection creata per ${participantId}`);
    
    // Start the connection process as initiator
    await this.createOffer(participantId);
    
    console.log(`[WebRTC Recovery] 📤 Nuova offerta inviata per connessione ricreata di ${participantId}`);
  }

  /**
   * Aspetta che la connessione si stabilizzi
   * @param {string} participantId 
   * @param {number} timeout 
   */
  async _waitForConnectionStabilization(participantId, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const pc = this.peerConnections[participantId];
      if (!pc) {
        reject(new Error(`PeerConnection per ${participantId} non trovata`));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for connection stabilization for ${participantId}`));
      }, timeout);

      const checkConnection = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          clearTimeout(timeoutId);
          pc.removeEventListener('iceconnectionstatechange', checkConnection);
          resolve();
        } else if (pc.iceConnectionState === 'failed') {
          clearTimeout(timeoutId);
          pc.removeEventListener('iceconnectionstatechange', checkConnection);
          reject(new Error(`Connection failed during stabilization for ${participantId}`));
        }
      };

      pc.addEventListener('iceconnectionstatechange', checkConnection);
      
      // Check current state immediately
      checkConnection();
    });
  }
  /**
   * Gestisce il fallimento definitivo della connessione dopo tutti i tentativi
   * @param {string} participantId 
   */
  _handleConnectionFailure(participantId) {
    const attemptCount = this.reconnectionAttempts[participantId] || 0;
    const userData = this.userData[participantId];
    const userInfo = userData ? `${userData.handle} (${participantId})` : participantId;
    
    // Log critico per debug
    console.error(`\n========================================`);
    console.error(`❌ CONNESSIONE WEBRTC FALLITA DEFINITIVAMENTE`);
    console.error(`========================================`);
    console.error(`👤 Utente: ${userInfo}`);
    console.error(`🔢 Tentativi effettuati: ${attemptCount}/${this.MAX_RECONNECTION_ATTEMPTS}`);
    console.error(`⏰ Tempo trascorso: ${Date.now() - (this.connectionTimestamps[participantId] || Date.now())}ms`);
    console.error(`🏥 Ultimo stato salutare: ${this.lastKnownGoodStates[participantId] ? new Date(this.lastKnownGoodStates[participantId]).toISOString() : 'Mai connesso'}`);
    
    const pc = this.peerConnections[participantId];
    if (pc) {
      console.error(`🔗 Stato finale connessione:`);
      console.error(`   - ICE Connection: ${pc.iceConnectionState}`);
      console.error(`   - Connection: ${pc.connectionState}`);
      console.error(`   - Signaling: ${pc.signalingState}`);
      console.error(`   - ICE Gathering: ${pc.iceGatheringState}`);
    }
    
    console.error(`💡 CAUSE POSSIBILI:`);
    console.error(`   - Problemi di rete/firewall`);
    console.error(`   - Server STUN/TURN non disponibili`);
    console.error(`   - NAT troppo restrittivo`);
    console.error(`   - L'altro client ha problemi`);
    console.error(`========================================\n`);
    
    this._reportConnectionEvent(participantId, 'connection_failed_permanently', {
      attempts: attemptCount,
      maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
      duration: Date.now() - (this.connectionTimestamps[participantId] || Date.now()),
      lastGoodConnection: this.lastKnownGoodStates[participantId]
    });
    
    // Clean up connection tracking
    this._clearConnectionTracking(participantId);
    
    // Close the failed connection
    this.closePeerConnection(participantId);
    
    // Notify UI about the permanent failure with more context
    if (this.onPeerConnectionStateChange) {
      this.onPeerConnectionStateChange(participantId, 'failed_permanently', {
        reason: 'max_reconnection_attempts_exceeded',
        attempts: attemptCount,
        userInfo: userInfo
      });
    }
    
    // Optional: You could emit a specific event for permanent failures
    eventEmitter.emit('webrtc_connection_permanently_failed', {
      participantId,
      userInfo,
      attempts: attemptCount,
      reason: 'Connessione fallita dopo tutti i tentativi di riconnessione'
    });
  }

  /**
   * Mette in coda un ICE candidate se la descrizione remota non è ancora impostata
   * @param {string} participantId 
   * @param {RTCIceCandidate} candidate 
   */
  _queueICECandidate(participantId, candidate) {
    if (!this.iceCandidateQueues[participantId]) {
      this.iceCandidateQueues[participantId] = [];
    }
    
    this.iceCandidateQueues[participantId].push(candidate);
    console.log(`[WebRTC ICE] Candidato ICE messo in coda per ${participantId}. Coda: ${this.iceCandidateQueues[participantId].length}`);
  }

  /**
   * Processa tutti i candidati ICE in coda
   * @param {string} participantId 
   */
  async _processQueuedICECandidates(participantId) {
    const queue = this.iceCandidateQueues[participantId];
    if (!queue || queue.length === 0) return;

    const pc = this.peerConnections[participantId];
    if (!pc || !pc.remoteDescription) return;

    console.log(`[WebRTC ICE] Processando ${queue.length} candidati ICE in coda per ${participantId}`);

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
        console.log(`[WebRTC ICE] Candidato ICE processato dalla coda per ${participantId}`);
      } catch (error) {
        console.error(`[WebRTC ICE] Errore processando candidato dalla coda per ${participantId}:`, error);
      }
    }

    // Clear the queue
    this.iceCandidateQueues[participantId] = [];
  }
  /**
   * Pulisce tutto il tracking della connessione per un partecipante
   * @param {string} participantId 
   */
  _clearConnectionTracking(participantId) {
    console.log(`[WebRTC Cleanup] Pulizia tracking connessione per ${participantId}`);
    
    // Stop health monitoring
    this._stopConnectionHealthCheck(participantId);
    
    // Clear reconnection timeout
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
      delete this.reconnectionTimeouts[participantId];
    }
    
    // Clear all tracking data
    delete this.connectionStates[participantId];
    delete this.connectionTimestamps[participantId];
    delete this.reconnectionAttempts[participantId];
    delete this.lastKnownGoodStates[participantId];
    delete this.iceCandidateQueues[participantId];
    delete this.negotiationInProgress[participantId];
  }

  /**
   * Ottieni statistiche di connessione per debugging
   * @param {string} participantId - Opzionale, se non specificato restituisce stats per tutti
   * @returns {Object} Statistiche di connessione
   */
  getConnectionStats(participantId = null) {
    if (participantId) {
      const pc = this.peerConnections[participantId];
      const userData = this.userData[participantId];
      const currentTime = Date.now();
      
      return {
        participantId,
        userHandle: userData?.handle || 'Unknown',
        connectionExists: !!pc,
        connectionState: pc?.connectionState || 'N/A',
        iceConnectionState: pc?.iceConnectionState || 'N/A',
        signalingState: pc?.signalingState || 'N/A',
        iceGatheringState: pc?.iceGatheringState || 'N/A',
        reconnectionAttempts: this.reconnectionAttempts[participantId] || 0,
        maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
        connectionAge: this.connectionTimestamps[participantId] 
          ? Math.round((currentTime - this.connectionTimestamps[participantId]) / 1000) 
          : 0,
        lastGoodConnection: this.lastKnownGoodStates[participantId]
          ? Math.round((currentTime - this.lastKnownGoodStates[participantId]) / 1000)
          : null,
        queuedCandidates: this.iceCandidateQueues[participantId]?.length || 0,
        negotiationInProgress: this.negotiationInProgress[participantId] || false,
        hasRemoteStream: !!this.remoteStreams[participantId],
        remoteStreamTracks: this.remoteStreams[participantId]?.getTracks()?.length || 0
      };
    } else {
      // Return stats for all connections
      const allStats = {};
      Object.keys(this.peerConnections).forEach(id => {
        allStats[id] = this.getConnectionStats(id);
      });
      
      return {
        totalConnections: Object.keys(this.peerConnections).length,
        myId: this.myId,
        chatId: this.chatId,
        hasLocalStream: !!this.localStream,
        localStreamTracks: this.localStream?.getTracks()?.length || 0,
        connections: allStats,
        healthCheckInterval: this.HEALTH_CHECK_INTERVAL,
        maxReconnectionAttempts: this.MAX_RECONNECTION_ATTEMPTS,
        reconnectionBaseDelay: this.RECONNECTION_BASE_DELAY
      };
    }
  }

  /**
   * Stampa un report dettagliato delle connessioni per debugging
   */
  printConnectionReport() {
    console.log('\n🔍 ===== WEBRTC CONNECTION REPORT =====');
    const stats = this.getConnectionStats();
    
    console.log(`👤 My ID: ${stats.myId}`);
    console.log(`💬 Chat ID: ${stats.chatId}`);
    console.log(`🎤 Local Stream: ${stats.hasLocalStream ? `✅ (${stats.localStreamTracks} tracks)` : '❌'}`);
    console.log(`🔗 Total Connections: ${stats.totalConnections}`);
    console.log(`⚙️ Health Check Interval: ${stats.healthCheckInterval}ms`);
    console.log(`🔄 Max Reconnection Attempts: ${stats.maxReconnectionAttempts}`);
    
    if (stats.totalConnections === 0) {
      console.log('📭 No active connections');
    } else {
      console.log('\n📊 CONNECTION DETAILS:');
      Object.entries(stats.connections).forEach(([id, conn]) => {
        console.log(`\n👥 ${conn.userHandle} (${id}):`);
        console.log(`   🔗 Connection: ${conn.connectionState} | ICE: ${conn.iceConnectionState}`);
        console.log(`   📡 Signaling: ${conn.signalingState} | ICE Gathering: ${conn.iceGatheringState}`);
        console.log(`   🔄 Reconnection: ${conn.reconnectionAttempts}/${conn.maxAttempts}`);
        console.log(`   ⏰ Age: ${conn.connectionAge}s | Last Good: ${conn.lastGoodConnection ? conn.lastGoodConnection + 's ago' : 'Never'}`);
        console.log(`   📺 Remote Stream: ${conn.hasRemoteStream ? `✅ (${conn.remoteStreamTracks} tracks)` : '❌'}`);
        console.log(`   📋 Queued Candidates: ${conn.queuedCandidates} | Negotiating: ${conn.negotiationInProgress ? '✅' : '❌'}`);
      });
    }
    
    console.log('===== END REPORT =====\n');
  }

  /**
   * Crea un'offerta SDP per un partecipante specifico.
   * @param {string} participantId - L'ID del destinatario dell'offerta.
   */
  async createOffer(participantId) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.error(`PeerConnection for ${participantId} not found`);
      return;
    }

    try {
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true,
        iceRestart: true,
      };

      console.log(`Creating offer for ${participantId}...`);
      const offer = await pc.createOffer(offerOptions);

      console.log(`Setting local description for ${participantId}...`);
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      if (pc.iceGatheringState !== "complete") {
        await new Promise((resolve) => {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
        });
      }

      console.log(`Sending offer to ${participantId}`);
      await WebSocketMethods.RTCOffer({
        sdp: pc.localDescription.sdp,
        to: participantId,
        from: this.myId,
      });
    } catch (error) {
      console.error(`Error creating/sending offer to ${participantId}:`, error);
    }
  }

  /**
   * Gestisce un messaggio di segnalazione ricevuto. Ora deve considerare 'from' e 'to'.
   * @param {object} message - Es: { sdp: '...', from: 'peerA', to: 'myId' }
   */

  // Ignora messaggi non destinati a me (anche se il server dovrebbe già filtrare)
  async assureMessageIsForMe(message) {
    if (message.to && message.to !== this.myId) {
      console.log(
        `MultiPeerWebRTCManager: Messaggio ignorato, non per me (destinatario: ${message.to})`
      );
      return;
    }

    // Il mittente del messaggio (l'altro peer)
    const senderId = message.from;
    if (!senderId) {
      console.warn(
        "MultiPeerWebRTCManager: Ricevuto messaggio di segnalazione senza ID mittente:",
        message
      );
      return;
    }

    console.log(`MultiPeerWebRTCManager: Ricevuto messaggio da ${senderId}`);
    return true;
  }

  // Assicurati che la connessione peer per questo mittente esista o creala se necessario (es. su offerta)
  async assureConnectionExists(message) {
    const senderId = message.from;
    let pc = this.peerConnections[senderId];
    if (!pc) {
      // Se riceviamo un'offerta o un candidato da un nuovo peer, creiamo la connessione per lui
      console.log(
        `MultiPeerWebRTCManager: Creo connessione per il nuovo peer ${senderId}`
      );
      // Assicurati che lo stream locale sia pronto PRIMA di creare la connessione per un nuovo peer
      if (!this.localStream) {
        try {
          await this.startLocalStream();
        } catch (error) {
          console.error(
            `MultiPeerWebRTCManager: Impossibile avviare stream locale da ${senderId}`
          );
          return false; // Non possiamo procedere senza stream locale
        }
      }
      pc = this.createPeerConnection(message);
      if (!pc) {
        console.error(
          `MultiPeerWebRTCManager: Fallimento creazione PeerConnection per ${senderId} su ricezione segnale.`
        );
        return false;
      }
    } else if (!pc) {
      console.error(
        `MultiPeerWebRTCManager: Ricevuto messaggio da ${senderId} ma non esiste una PeerConnection.`
      );
      return false; // Non possiamo gestire risposta o candidato senza connessione esistente
    }
    return pc;
  }

  getExistingPeerConnection(participantId) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.warn(
        // Cambiato da error a warn, potrebbe essere normale se arriva un candidato "in ritardo"
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} non trovata.`
      );
    }
    return pc;
  }
  async offerMessage(message) {
    console.log("🟡🟡🟡offerta arrivata");
    if (!(await this.assureMessageIsForMe(message))) {
      return;
    }
    const pc = await this.assureConnectionExists(message);
    if (!pc) {
      return;
    }
    const senderId = message.from;
    if (!message.sdp) {
      console.error("Offerta ricevuta senza SDP da", senderId);
      return;
    }
    
    console.log(`[WebRTC Offer] Gestione offerta da ${senderId}...`);
    this._reportConnectionEvent(senderId, 'offer_received');
    this._logConnectionDebugInfo(senderId, 'offer_processing');

    if (pc.signalingState === "closed") {
      console.warn("[WebRTC Offer] Cannot handle offer, connection is closed");
      this._reportConnectionEvent(senderId, 'offer_rejected_connection_closed');
      return;
    }
    
    // Instead of restricting to very specific states, just proceed with handling the SDP
    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: message.sdp })
      );
      console.log(`[WebRTC Offer] ✅ Remote description (offer) from ${senderId} set.`);
      this._reportConnectionEvent(senderId, 'offer_remote_description_set');
      
      // Process any queued ICE candidates now that remote description is set
      await this._processQueuedICECandidates(senderId);
      
      await this.createAnswer(senderId);
    } catch (error) {
      console.error(`[WebRTC Offer] ❌ Error handling offer from ${senderId}:`, error);
      this._reportConnectionEvent(senderId, 'offer_handling_failed', error.message);
      
      // Trigger recovery if offer handling fails
      this._attemptConnectionRecovery(senderId);
    }
  }

  async answerMessage(message) {
    console.log("[WebRTC Answer] Risposta arrivata");
    if (!(await this.assureMessageIsForMe(message))) {
      return;
    }
    const pc = await this.getExistingPeerConnection(message.from);
    if (!pc) {
      return;
    }
    const senderId = message.from;
    if (!message.sdp) {
      console.error("[WebRTC Answer] Risposta ricevuta senza SDP da", senderId);
      return;
    }
    
    console.log(`[WebRTC Answer] Gestione risposta da ${senderId}...`);
    this._reportConnectionEvent(senderId, 'answer_received');
    this._logConnectionDebugInfo(senderId, 'answer_processing');

    if (!(pc.signalingState === "have-local-offer")) {
      console.warn(
        `[WebRTC Answer] Impossibile gestire risposta, signalingState=${pc.signalingState}`
      );
      this._reportConnectionEvent(senderId, 'answer_rejected_wrong_signaling_state', pc.signalingState);
      return;
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: message.sdp })
      );
      console.log(
        `[WebRTC Answer] ✅ Descrizione remota (risposta) da ${senderId} impostata.`
      );
      this._reportConnectionEvent(senderId, 'answer_remote_description_set');
      
      // Process any queued ICE candidates now that remote description is set
      await this._processQueuedICECandidates(senderId);
      
      // Clear negotiation flag on successful answer
      this.negotiationInProgress[senderId] = false;
      
      // Connessione SDP stabilita con 'senderId'
    } catch (error) {
      console.error(`[WebRTC Answer] ❌ Error handling answer from ${senderId}:`, error);
      this._reportConnectionEvent(senderId, 'answer_handling_failed', error.message);
      
      // Trigger recovery if answer handling fails
      this._attemptConnectionRecovery(senderId);
    }
  }
  // filepath: d:\Github\Messanger_react_native\Messanger\app\utils\webrtcMethods.js
  async candidateMessage(message) {
    if (!(await this.assureMessageIsForMe(message))) {
      return;
    }

    const pc = await this.getExistingPeerConnection(message.from);
    if (!pc) {
      return;
    }

    const participantId = message.from;
    
    try {
      if (message.candidate) {
        console.log(
          `[WebRTC ICE] Ricevuto candidato ICE da ${participantId}:`,
          {
            type: message.candidate.type,
            protocol: message.candidate.protocol,
            foundation: message.candidate.foundation
          }
        );
        
        this._reportConnectionEvent(participantId, 'ice_candidate_received', {
          type: message.candidate.type,
          protocol: message.candidate.protocol
        });

        const candidate = new RTCIceCandidate(message.candidate);
        
        // Check if remote description is set, if not queue the candidate
        if (!pc.remoteDescription) {
          console.log(`[WebRTC ICE] Remote description non ancora impostata per ${participantId}, metto candidato in coda`);
          this._queueICECandidate(participantId, candidate);
          return;
        }

        // Try to add the candidate with retry logic for Android
        let retryCount = 0;
        const maxRetries = Platform.OS === 'android' ? 3 : 1;
        
        while (retryCount < maxRetries) {
          try {
            await pc.addIceCandidate(candidate);
            console.log(`[WebRTC ICE] ✅ Candidato ICE aggiunto con successo per ${participantId}`);
            this._reportConnectionEvent(participantId, 'ice_candidate_added_successfully');
            break;
          } catch (error) {
            retryCount++;
            console.warn(`[WebRTC ICE] ⚠️ Tentativo ${retryCount}/${maxRetries} fallito per candidato ICE di ${participantId}:`, error);
            
            if (retryCount < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
            } else {
              console.error(`[WebRTC ICE] ❌ Tutti i tentativi falliti per candidato ICE di ${participantId}`);
              this._reportConnectionEvent(participantId, 'ice_candidate_failed', error.message);
              throw error;
            }
          }
        }
        
      } else {
        console.log(`[WebRTC ICE] Fine candidati ICE per ${participantId}`);
        this._reportConnectionEvent(participantId, 'ice_candidates_complete');
        await pc.addIceCandidate(null);
      }
    } catch (error) {
      console.error(`[WebRTC ICE] Errore aggiunta candidato ICE per ${participantId}:`, error);
      this._reportConnectionEvent(participantId, 'ice_candidate_error', error.message);
      
      // Don't trigger recovery for candidate errors as they're usually not critical
      // The connection might still work with other candidates
    }
  }

  async userJoined(message) {
    if (message.chat_id != this.chatId) {
      return;
    }
    // Un nuovo utente (message.userId) è entrato nella stanza
    const newUserId = message.from;
    if (
      newUserId &&
      newUserId !== this.myId &&
      !this.peerConnections[newUserId]
    ) {
      console.log(
        `MultiPeerWebRTCManager: Utente ${newUserId} entrato. Inizio connessione...`
      );
      await this.connectToNewParticipant(message);
    }
  }

  async userLeft(message) {
    if (message.chat_id != this.chatId) {
      return;
    }
    // Un utente (message.userId) ha lasciato la stanza
    const leavingUserId = message.from;
    if (leavingUserId && leavingUserId !== this.myId) {
      console.log(
        `MultiPeerWebRTCManager: Utente ${leavingUserId} uscito. Chiudo la connessione...`
      );
      this.closePeerConnection(leavingUserId);
    }
  }

  async setExistingUsers(existingUsers) {
    // Ricevuto elenco di utenti (message.users: array di ID) già presenti nella stanza

    console.log(
      `MultiPeerWebRTCManager: Utenti esistenti nella stanza:`,
      existingUsers
    );
    for (const existingUser of existingUsers) {
      if (
        existingUser.from !== this.myId &&
        !this.peerConnections[existingUser.from]
      ) {
        console.log(
          `MultiPeerWebRTCManager: Connessione all'utente esistente ${existingUser.handle}...`
        );
        await this.connectToNewParticipant(existingUser);
      }
    }
  }

  /**
   * Crea una risposta SDP per un partecipante specifico.
   * @param {string} participantId - L'ID del peer a cui rispondere (quello che ha inviato l'offerta).
   */
  async createAnswer(participantId) {
    console.log("Inizio creazione risposta SDP...🎂🎂");
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.error(
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} non trovata per creare risposta.`
      );
      return;
    }
    if (!(pc.signalingState === "have-remote-offer")) {
      console.warn(
        `MultiPeerWebRTCManager: Impossibile creare answer, signalingState=${pc.signalingState}`
      );
      return;
    }
    console.log(
      `MultiPeerWebRTCManager: Creazione risposta SDP per ${participantId}...`
    );
    try {
      const answer = await pc.createAnswer();
      console.log(
        `MultiPeerWebRTCManager: Risposta SDP creata per ${participantId}. ✨✨✨`
      );
      await pc.setLocalDescription(answer);
      console.log(
        `MultiPeerWebRTCManager: Risposta per ${participantId} creata e impostata localmente.`
      );

      await WebSocketMethods.RTCAnswer({
        sdp: pc.localDescription.sdp,
        to: participantId,
        from: this.myId,
      });
    } catch (error) {
      console.error(
        `MultiPeerWebRTCManager: Errore creazione/invio risposta per ${participantId}:`,
        error
      );
    }
  }

  /**
   * Inizia il processo di connessione a un nuovo partecipante.
   * Di solito, questo implica creare una PeerConnection e inviare un'offerta.
   * @param {string} participantId
   */
  async connectToNewParticipant(participant) {
    const participantId = participant.from;

    if (this.peerConnections[participantId]) {
      console.log(
        `MultiPeerWebRTCManager: Connessione a ${participantId} già in corso o esistente.`
      );
      return;
    }
    // Assicurati che lo stream locale sia pronto
    if (!this.localStream) {
      console.log(
        `MultiPeerWebRTCManager: Avvio stream locale prima di connettersi a ${participantId}`
      );
      try {
        await this.startLocalStream();
      } catch (e) {
        console.error(
          `MultiPeerWebRTCManager: Impossibile avviare stream locale per connettersi a ${participantId}. Annullamento.`
        );
        return;
      }
    }
    const pc = this.createPeerConnection(participant);
    if (pc) {
      // Chi inizia la connessione (noi, in questo caso) crea l'offerta
      await this.createOffer(participantId);
    }
  }

  /**
   * Chiude la connessione con UN partecipante specifico.
   * @param {string} participantId
   */
  closePeerConnection(participantId) {
    const pc = this.peerConnections[participantId];
    if (pc) {
      console.log(
        `MultiPeerWebRTCManager: Chiusura connessione con ${participantId}...`
      );
      pc.close();
      delete this.peerConnections[participantId]; // Rimuovi dalla lista
      delete this.userData[participantId];
    }
    // Rimuovi anche lo stream remoto associato
    const remoteStream = this.remoteStreams[participantId];
    if (remoteStream) {
      // Non è strettamente necessario fermare le tracce remote, ma pulisce lo stato
      remoteStream.getTracks().forEach((track) => track.stop());
      delete this.remoteStreams[participantId];
      console.log(
        `MultiPeerWebRTCManager: Stream remoto di ${participantId} rimosso.`
      );
    }

    // Notifica l'UI che il partecipante è uscito
    if (this.onParticipantLeft) {
      this.onParticipantLeft(participantId);
    }
    console.log(
      `MultiPeerWebRTCManager: Connessione con ${participantId} chiusa.`
    );
  }
  // chiude lo stream locale
  closeLocalStream() {
    // Stop voice activity detection first
    this.stopVoiceActivityDetection();
    
    // Ferma lo stream locale
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      if (this.onLocalStreamReady) this.onLocalStreamReady(null);
      console.log("MultiPeerWebRTCManager: Stream locale fermato.");
    }
  }
  /**
   * Chiude TUTTE le connessioni e rilascia le risorse.
   */
  closeAllConnections() {
    console.log("MultiPeerWebRTCManager: Chiusura di tutte le connessioni...");

    // Stop voice activity detection
    this.stopVoiceActivityDetection();

    // Chiudi tutte le connessioni peer
    Object.keys(this.peerConnections).forEach((participantId) => {
      this.closePeerConnection(participantId); // Usa il metodo esistente per pulire singolarmente
    });
    this.peerConnections = {}; // Assicura che l'oggetto sia vuoto
    this.userData = {};

    // Pulisci gli stream remoti rimasti (dovrebbero essere già stati rimossi da closePeerConnection)
    this.remoteStreams = {};

    // Resetta ID
    this.myId = null;

    // Resetta chat ID
    this.chatId = null;

    // Disabilito gli event listeners non più necessari (candidate, offer, answer sono utili solo quando sei in una comms)
    this._removeEventListeners();
      console.log(
      "MultiPeerWebRTCManager: Tutte le connessioni chiuse e risorse rilasciate."
    );
    // Potresti voler notificare un cambio di stato generale qui
    // if (this.onPeerConnectionStateChange) this.onPeerConnectionStateChange(null, 'closed');
  }

  /**
   * Forza manualmente un tentativo di riconnessione per un partecipante specifico
   * Utile per testing o per interfacce utente che permettono retry manuali
   * @param {string} participantId 
   * @returns {boolean} True se il tentativo è stato avviato, false se non possibile
   */
  async forceReconnection(participantId) {
    if (!participantId || !this.peerConnections[participantId]) {
      console.warn(`[WebRTC Manual] Impossibile forzare riconnessione: partecipante ${participantId} non trovato`);
      return false;
    }

    const currentAttempts = this.reconnectionAttempts[participantId] || 0;
    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      console.warn(`[WebRTC Manual] Impossibile forzare riconnessione: tentativi massimi raggiunti per ${participantId} (${currentAttempts}/${this.MAX_RECONNECTION_ATTEMPTS})`);
      return false;
    }

    console.log(`[WebRTC Manual] 🔄 Forzando riconnessione manuale per ${participantId}`);
    
    // Reset some tracking to allow manual retry
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
      delete this.reconnectionTimeouts[participantId];
    }

    try {
      await this._attemptConnectionRecovery(participantId);
      return true;
    } catch (error) {
      console.error(`[WebRTC Manual] Errore durante riconnessione forzata per ${participantId}:`, error);
      return false;
    }
  }

  /**
   * Reset dei contatori di riconnessione per un partecipante (per testing o recovery manual)
   * @param {string} participantId 
   */
  resetReconnectionAttempts(participantId) {
    if (participantId) {
      console.log(`[WebRTC Manual] 🔄 Reset contatori riconnessione per ${participantId}`);
      this.reconnectionAttempts[participantId] = 0;
      
      // Clear any pending timeouts
      if (this.reconnectionTimeouts[participantId]) {
        clearTimeout(this.reconnectionTimeouts[participantId]);
        delete this.reconnectionTimeouts[participantId];
      }
    } else {
      console.log(`[WebRTC Manual] 🔄 Reset contatori riconnessione per tutti i partecipanti`);
      this.reconnectionAttempts = {};
      
      // Clear all pending timeouts
      Object.values(this.reconnectionTimeouts).forEach(timeout => clearTimeout(timeout));
      this.reconnectionTimeouts = {};
    }
  }

  async regenerate(
    myId,
    chatId,
    onLocalStreamReady,
    onRemoteStreamAddedOrUpdated,
    onPeerConnectionStateChange,
    onParticipantLeft
  ) {
    // Prima pulisci tutte le connessioni esistenti
    this.closeAllConnections();

    // Reinizializza tutte le proprietà
    this.myId = myId;
    this.chatId = chatId;
    this.onLocalStreamReady = onLocalStreamReady;
    this.onRemoteStreamAddedOrUpdated = onRemoteStreamAddedOrUpdated;
    this.onPeerConnectionStateChange = onPeerConnectionStateChange;
    this.onParticipantLeft = onParticipantLeft;    this.peerConnections = {};
    this.remoteStreams = {};
    this._setupEventListeners();

    // Initialize voice activity detection with platform-specific delay
    if (this.localStream) {
      console.log('VAD: Initializing after regenerate...');
      const delay = Platform.OS === 'web' ? 500 : 1000; // Longer delay for mobile
      setTimeout(() => {
        this.initializeVoiceActivityDetection();
      }, delay);
    }

    console.log(`MultiPeerWebRTCManager: Rigenerato per l'utente ${myId}`);
  }
}

let multiPeerWebRTCManager = new MultiPeerWebRTCManager();
export default multiPeerWebRTCManager;
