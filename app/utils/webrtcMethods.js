import WebSocketMethods from "./webSocketMethods";
import APIMethods from "./APImethods";
import { Platform } from "react-native";
import eventEmitter from "./EventEmitter";
import WebRTCEventReceiver from "./webrtc/eventReceiver";

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
  remoteScreenStreams = {}; // Oggetto per memorizzare gli screen share remoti: { participantId: { streamId: MediaStream } }
  remoteStreamMetadata = {}; // Metadata per tracciare i tipi di stream remoti: { participantId: { streamId: 'webcam'|'screenshare' } }

  // Screen sharing functionality
  screenStreams = {}; // Store multiple screen share streams { streamId: MediaStream }
  screenStreamCounter = 0; // Counter for unique stream IDs

  // Voice Activity Detection
  speakingUsers = new Set(); // Track who is currently speaking
  onSpeakingStatusChange = null; // Callback for UI updates

  // --- Callback UI aggiornate ---
  onLocalStreamReady = null;
  // Chiamata quando lo stato di una specifica connessione peer cambia
  onPeerConnectionStateChange = null;
  // Chiamata quando un partecipante lascia (la sua connessione viene chiusa)
  onParticipantLeft = null;
  onStreamUpdate = null;

  eventReciver = null; // Riferimento all'istanza dell'event receiver

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
  audioContextRef = null; // Riferimento al context audio
  
  // Pin state management
  pinnedUserId = null; // ID of the currently pinned rectangle (user ID or screen share ID)

  constructor(
    myId = null,
    chatId = null,
    onLocalStreamReady = null,
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
      this.onPeerConnectionStateChange = onPeerConnectionStateChange;
      this.onParticipantLeft = onParticipantLeft;
      this._setupEventListeners();
      this._initializeEventReceiver();
    } else {
      console.log("MultiPeerWebRTCManager: Inizializzato vuoto");
    }
    this.negotiationInProgress = {}; // Traccia rinegoziazioni per peer
  }

  /**
   * Set the audio context reference for handling WebRTC audio
   * @param {Object} audioContext - The audio context from useAudio hook
   */
  setAudioContext(audioContext) {
    this.audioContextRef = audioContext;
    console.log("WebRTC: Audio context reference set");
  }
  _initializeEventReceiver() {
    // Create and initialize the event receiver
    this.eventReceiver = new WebRTCEventReceiver(this);
    this.eventReceiver.initialize();
    console.log("[WebRTC] Event receiver initialized");
  }
  _cleanupEventReceiver() {
    if (this.eventReceiver) {
      this.eventReceiver.destroy();
      this.eventReceiver = null;
      console.log("[WebRTC] Event receiver cleaned up");
    }
  }
  // Gestione degli eventi
  _setupEventListeners() {
    // Rimuovi eventuali listener precedenti
    this._removeEventListeners();

    // Aggiungi i listener per i vari tipi di messaggi
    eventEmitter.on("offer", this.offerMessage.bind(this));
    eventEmitter.on("answer", this.answerMessage.bind(this));
    eventEmitter.on("candidate", this.candidateMessage.bind(this));

    // da togliere quelli sotto
    // Add speaking status listeners
    eventEmitter.on("speaking", this.handleRemoteSpeaking.bind(this));
    eventEmitter.on("not_speaking", this.handleRemoteNotSpeaking.bind(this));

    // Add screen sharing listeners
    eventEmitter.on(
      "screen_share_started",
      this.handleRemoteScreenShareStarted.bind(this)
    );
    eventEmitter.on(
      "screen_share_stopped",
      this.handleRemoteScreenShareStopped.bind(this)
    );

    console.log("MultiPeerWebRTCManager: Event listeners configurati");
  }
  // Metodo per rimuovere gli event listeners
  _removeEventListeners() {
    eventEmitter.off("offer", this.offerMessage.bind(this));
    eventEmitter.off("answer", this.answerMessage.bind(this));
    eventEmitter.off("candidate", this.candidateMessage.bind(this));

    // da far sparire
    eventEmitter.off("speaking", this.handleRemoteSpeaking.bind(this));
    eventEmitter.off("not_speaking", this.handleRemoteNotSpeaking.bind(this));
    eventEmitter.off(
      "screen_share_started",
      this.handleRemoteScreenShareStarted.bind(this)
    );
    eventEmitter.off(
      "screen_share_stopped",
      this.handleRemoteScreenShareStopped.bind(this)
    );
  }

  setUserSpeaking(userId, isSpeaking) {
    if (this.userData[userId]) {
      this.userData[userId].is_speaking = isSpeaking;
    }
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
        video: audioOnly
          ? false
          : {
              facingMode: "user",
              width: 1920,
              height: 1080,
            },
      };
      const stream = await mediaDevices.getUserMedia(constraints);
      console.log("MultiPeerWebRTCManager: Stream locale ottenuto.");
      this.localStream = stream;
      if (this.onLocalStreamReady) {
        this.onLocalStreamReady(stream);
      }

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
   * Handle remote screen share started events
   */
  handleRemoteScreenShareStarted(data) {
    const { from, streamId } = data;
    if (from && from !== this.myId) {
      console.log(`Remote screen share started: ${from}/${streamId}`);

      // Initialize metadata tracking
      if (!this.remoteStreamMetadata[from]) {
        this.remoteStreamMetadata[from] = {};
      }
      this.remoteStreamMetadata[from][streamId] = "screenshare";

      // The actual stream will be handled in ontrack when the media arrives
    }
  }

  /**
   * Handle remote screen share stopped events
   */
  handleRemoteScreenShareStopped(data) {
    const { from, streamId } = data;
    if (from && from !== this.myId) {
      console.log(`Remote screen share stopped: ${from}/${streamId}`);

      // Remove from metadata
      if (this.remoteStreamMetadata[from]) {
        delete this.remoteStreamMetadata[from][streamId];
      }

      // Remove the stream
      if (
        this.remoteScreenStreams[from] &&
        this.remoteScreenStreams[from][streamId]
      ) {
        delete this.remoteScreenStreams[from][streamId];
        this.notifyStreamUpdate();
      }
    }
  }

  /**
   * Crea e configura una RTCPeerConnection PER UN SINGOLO PARTECIPANTE REMOTO.
   * @param {string} participantId - L'ID univoco del partecipante remoto.
   * @returns {RTCPeerConnection} La connessione creata.
   */ createPeerConnection(participant) {
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
      this._reportConnectionEvent(participantId, "peer_connection_created");

      // --- Gestione Eventi Specifica per questa Connessione ---

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Invia il candidato SPECIFICATAMENTE a questo partecipante
          console.log(`[WebRTC ICE] Invio candidato ICE a ${participantId}`);
          this._reportConnectionEvent(participantId, "ice_candidate_sent", {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
          });

          await WebSocketMethods.IceCandidate({
            candidate: event.candidate.toJSON(),
            to: participantId,
            from: this.myId,
          });
        } else {
          console.log(
            `[WebRTC ICE] ICE gathering completato per ${participantId}`
          );
          this._reportConnectionEvent(participantId, "ice_gathering_complete");
        }
      }; // In webrtcMethods.js, inside createPeerConnection method
      pc.ontrack = (event) => {
        console.log(
          `[WebRTC Track] Ricevuta track remota da ${participantId}:`,
          event.track.kind,
          "label:",
          event.track.label,
          "id:",
          event.track.id,
          "streams:",
          event.streams.map((s) => s.id)
        );
        this._reportConnectionEvent(participantId, "remote_track_received", {
          kind: event.track.kind,
        });

        // Check if we have metadata for this track (from signaling)
        let isScreenShare = false;
        let streamId = null;

        // Try to match the track to a known screen share stream
        if (this.remoteStreamMetadata[participantId]) {
          // Look for screen share metadata based on stream IDs or track IDs
          for (const [metaStreamId, streamType] of Object.entries(
            this.remoteStreamMetadata[participantId]
          )) {
            if (streamType === "screenshare") {
              // Use the stream ID from event.streams or fallback to track-based detection
              const eventStreamId =
                event.streams.length > 0 ? event.streams[0].id : event.track.id;
              if (
                eventStreamId.includes(metaStreamId) ||
                metaStreamId.includes("screen")
              ) {
                isScreenShare = true;
                streamId = metaStreamId;
                break;
              }
            }
          }
        }

        // Fallback: try to identify screen share tracks by label or stream ID patterns
        if (!isScreenShare) {
          const isScreenShareFallback =
            event.track.label.includes("screen") ||
            event.track.label.includes("Screen") ||
            event.track.id.includes("screen") ||
            (event.streams.length > 0 &&
              event.streams[0].id.includes("screen"));

          if (isScreenShareFallback) {
            isScreenShare = true;
            streamId =
              event.streams.length > 0
                ? event.streams[0].id
                : `screen_${Date.now()}`;

            // Update metadata for future use
            if (!this.remoteStreamMetadata[participantId]) {
              this.remoteStreamMetadata[participantId] = {};
            }
            this.remoteStreamMetadata[participantId][streamId] = "screenshare";
          }
        }

        if (isScreenShare && streamId) {
          // Handle screen share tracks separately
          if (!this.remoteScreenStreams) {
            this.remoteScreenStreams = {};
          }
          if (!this.remoteScreenStreams[participantId]) {
            this.remoteScreenStreams[participantId] = {};
          }

          // Create or get the screen share stream for this specific streamId
          if (!this.remoteScreenStreams[participantId][streamId]) {
            this.remoteScreenStreams[participantId][streamId] =
              new MediaStream();
          }
          this.remoteScreenStreams[participantId][streamId].addTrack(
            event.track
          );
          console.log(
            `[WebRTC Track] Added screen share track to ${participantId}/${streamId}`
          );

          // Emit global stream event for screen sharing
          eventEmitter.emit("stream_added_or_updated", {
            participantId,
            stream: this.remoteScreenStreams[participantId][streamId],
            streamType: "screenshare",
            streamId: streamId,
            userData: this.userData[participantId],
          });
        } else {
          // Handle regular webcam tracks
          if (!this.remoteStreams[participantId]) {
            this.remoteStreams[participantId] = new MediaStream();
          } // Aggiungi la traccia allo stream esistente
          const stream = this.remoteStreams[participantId];
          stream.addTrack(event.track); // Gestione audio tramite AudioContext
          if (this.audioContextRef && stream.getAudioTracks().length > 0) {
            this.audioContextRef.addAudio(participantId, stream);
          }

          // Emit global stream event instead of direct callback
          eventEmitter.emit("stream_added_or_updated", {
            participantId,
            stream,
            streamType: "webcam",
            userData: this.userData[participantId],
          });
        }

        this.notifyStreamUpdate();

        event.track.onended = () => {
          this.notifyStreamUpdate();
          this._reportConnectionEvent(participantId, "remote_track_ended", {
            kind: event.track.kind,
          });
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

        this._reportConnectionEvent(
          participantId,
          `ice_connection_state_${newState}`
        );
        this._logConnectionDebugInfo(participantId, "ice_state_change");

        if (this.onPeerConnectionStateChange) {
          this.onPeerConnectionStateChange(participantId, newState);
        }

        // Enhanced state handling with recovery
        switch (newState) {
          case "connected":
          case "completed":
            console.log(
              `[WebRTC State] ✅ Connection to ${participantId} established successfully`
            );
            this._reportConnectionEvent(
              participantId,
              "connection_established_successfully"
            );
            break;

          case "failed":
            console.warn(
              `[WebRTC State] ❌ Connection to ${participantId} failed`
            );
            this._reportConnectionEvent(participantId, "connection_failed");
            // Trigger automatic recovery
            this._attemptConnectionRecovery(participantId);
            break;

          case "disconnected":
            console.warn(
              `[WebRTC State] ⚠️ Connection to ${participantId} disconnected`
            );
            this._reportConnectionEvent(
              participantId,
              "connection_disconnected"
            );
            // Give some time for self-recovery before attempting manual recovery
            setTimeout(() => {
              if (pc.iceConnectionState === "disconnected") {
                console.warn(
                  `[WebRTC State] Connection to ${participantId} still disconnected after 5s, attempting recovery`
                );
                this._attemptConnectionRecovery(participantId);
              }
            }, 5000);
            break;

          case "checking":
            console.log(
              `[WebRTC State] 🔄 Connection to ${participantId} checking...`
            );
            this._reportConnectionEvent(participantId, "connection_checking");
            break;

          case "new":
            console.log(`[WebRTC State] 🆕 New connection to ${participantId}`);
            this._reportConnectionEvent(participantId, "connection_new");
            break;
        }
      };

      // Additional connection state monitoring
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(
          `[WebRTC State] Overall connection state for ${participantId}: ${state}`
        );
        this._reportConnectionEvent(participantId, `connection_state_${state}`);

        if (state === "failed") {
          this._attemptConnectionRecovery(participantId);
        }
      };

      // Signaling state monitoring
      pc.onsignalingstatechange = () => {
        const state = pc.signalingState;
        console.log(
          `[WebRTC State] Signaling state for ${participantId}: ${state}`
        );
        this._reportConnectionEvent(participantId, `signaling_state_${state}`);
      };

      // ICE gathering state monitoring
      pc.onicegatheringstatechange = () => {
        const state = pc.iceGatheringState;
        console.log(
          `[WebRTC State] ICE gathering state for ${participantId}: ${state}`
        );
        this._reportConnectionEvent(
          participantId,
          `ice_gathering_state_${state}`
        );
      };

      // Aggiungi lo stream locale a QUESTA specifica connessione peer
      if (this.localStream) {
        this._addLocalTracksToPeerConnection(pc);
        this._reportConnectionEvent(participantId, "local_tracks_added");
      } else {
        console.warn(
          `MultiPeerWebRTCManager: Attenzione - PeerConnection per ${participantId} creata senza stream locale pronto.`
        );
        this._reportConnectionEvent(
          participantId,
          "created_without_local_stream"
        );
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
      this._reportConnectionEvent(
        participantId,
        "peer_connection_creation_failed",
        error.message
      );
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
          aspectRatio: { ideal: 16 / 9 },
          facingMode: "user",
        },
      });
      const videoTrack = videoStream.getVideoTracks()[0];

      if (this.localStream && videoTrack) {
        this.localStream.addTrack(videoTrack);

        // Aggiungi la traccia a tutte le peer connections attive
        for (const [peerId, pc] of Object.entries(this.peerConnections)) {
          if (
            pc.connectionState === "connected" ||
            pc.connectionState === "connecting"
          ) {
            try {
              await pc.addTrack(videoTrack, this.localStream);
            } catch (error) {
              console.error(
                `Error adding video track to peer ${peerId}:`,
                error
              );
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
      // Handle permission denied gracefully
      if (error.name === "NotAllowedError" || error.message.includes("Permission denied")) {
        console.log("Video permission denied by user - silently ignoring");
        return null; // Return null instead of throwing, so the UI can stay in previous state
      }
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
      videoTracks.forEach((track) => {
        track.stop();
        this.localStream.removeTrack(track);
      });

      // Rimuovi i sender dalle peer connections
      for (const [peerId, pc] of Object.entries(this.peerConnections)) {
        if (
          pc.connectionState === "connected" ||
          pc.connectionState === "connecting"
        ) {
          const senders = pc.getSenders();
          for (const sender of senders) {
            if (sender.track && sender.track.kind === "video") {
              try {
                await pc.removeTrack(sender);
              } catch (error) {
                console.error(
                  `Error removing video track from peer ${peerId}:`,
                  error
                );
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
        iceRestart: false,
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
      console.warn(
        `No peer connection found for ${participantId} when handling offer`
      );
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
      console.warn(
        `No peer connection found for ${participantId} when handling answer`
      );
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
    console.log(
      `[WebRTC Stability] Initializing connection tracking for ${participantId}`
    );

    this.connectionStates[participantId] = "connecting";
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
    console.log(
      `[WebRTC Event] ${timestamp} - ${participantId}: ${event}`,
      data || ""
    );

    // Update connection state
    if (event.includes("connected") || event.includes("completed")) {
      this.connectionStates[participantId] = "connected";
      this.lastKnownGoodStates[participantId] = Date.now();
      this.reconnectionAttempts[participantId] = 0; // Reset attempts on success
    } else if (event.includes("failed") || event.includes("disconnected")) {
      this.connectionStates[participantId] = "failed";
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
      queuedCandidates: this.iceCandidateQueues[participantId]?.length || 0,
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

    console.log(
      `[WebRTC Health] 🏥 Avvio monitoraggio sanitario per ${participantId}`
    );

    const healthChecker = setInterval(() => {
      const pc = this.peerConnections[participantId];
      if (!pc) {
        this._stopConnectionHealthCheck(participantId);
        return;
      }

      const currentTime = Date.now();
      const connectionAge =
        currentTime - (this.connectionTimestamps[participantId] || currentTime);
      const timeSinceLastGood = this.lastKnownGoodStates[participantId]
        ? currentTime - this.lastKnownGoodStates[participantId]
        : connectionAge;

      this._logConnectionDebugInfo(participantId, "health_check");

      // Enhanced health checks
      const isUnhealthy =
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed" ||
        pc.connectionState === "failed" ||
        (pc.iceConnectionState === "checking" && connectionAge > 30000) || // Too long in checking state
        (timeSinceLastGood > 45000 &&
          pc.iceConnectionState !== "connected" &&
          pc.iceConnectionState !== "completed"); // Too long without good connection

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

        console.warn(
          `[WebRTC Health] 🚨 Problema di salute rilevato per ${participantId}: ${reason}`
        );
        console.warn(
          `[WebRTC Health] 📊 Statistiche: età=${Math.round(
            connectionAge / 1000
          )}s, ultimoBuono=${Math.round(timeSinceLastGood / 1000)}s`
        );

        this._reportConnectionEvent(participantId, "health_issue_detected", {
          reason,
          connectionAge: Math.round(connectionAge / 1000),
          timeSinceLastGood: Math.round(timeSinceLastGood / 1000),
        });

        // Only trigger recovery if we haven't exceeded max attempts
        const currentAttempts = this.reconnectionAttempts[participantId] || 0;
        if (currentAttempts < this.MAX_RECONNECTION_ATTEMPTS) {
          this._attemptConnectionRecovery(participantId);
        } else {
          console.error(
            `[WebRTC Health] ⛔ Non avvio recupero per ${participantId}: tentativi esauriti (${currentAttempts}/${this.MAX_RECONNECTION_ATTEMPTS})`
          );
        }
      } else if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        // Connection is healthy - update last good state if it wasn't already recent
        if (
          !this.lastKnownGoodStates[participantId] ||
          currentTime - this.lastKnownGoodStates[participantId] > 10000
        ) {
          this.lastKnownGoodStates[participantId] = currentTime;
          console.log(
            `[WebRTC Health] ✅ Connessione salutare confermata per ${participantId}`
          );
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
      console.log(
        `[WebRTC Health] Stopped health monitoring for ${participantId}`
      );
    }
  }
  /**
   * Tentativo di recupero della connessione con politica di retry (MAX 3 tentativi)
   * @param {string} participantId
   */
  async _attemptConnectionRecovery(participantId) {
    const currentAttempts = this.reconnectionAttempts[participantId] || 0;

    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      console.error(
        `[WebRTC Recovery] ERRORE CRITICO: Raggiunti ${this.MAX_RECONNECTION_ATTEMPTS} tentativi massimi per ${participantId}. Connessione definitivamente fallita.`
      );
      console.error(
        `[WebRTC Recovery] IMPOSSIBILE STABILIRE CONNESSIONE CON ${participantId} - Tutti i tentativi di riconnessione sono falliti`
      );
      this._handleConnectionFailure(participantId);
      return;
    }

    this.reconnectionAttempts[participantId] = currentAttempts + 1;
    const attempt = this.reconnectionAttempts[participantId];

    // Exponential backoff: 2s, 4s, 8s
    const delay = this.RECONNECTION_BASE_DELAY * Math.pow(2, attempt - 1);

    console.warn(
      `[WebRTC Recovery] 🔄 Tentativo ${attempt}/${this.MAX_RECONNECTION_ATTEMPTS} di riconnessione per ${participantId} in ${delay}ms`
    );
    console.warn(
      `[WebRTC Recovery] Strategia: ${
        attempt === 1
          ? "ICE Restart"
          : attempt === 2
          ? "Rinegoziazione"
          : "Ricreazione connessione"
      }`
    );

    // Clear any existing timeout
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
    }

    // Report reconnection attempt to UI
    this._reportConnectionEvent(
      participantId,
      `reconnection_attempt_${attempt}`,
      {
        delay,
        strategy:
          attempt === 1
            ? "ice_restart"
            : attempt === 2
            ? "renegotiation"
            : "recreation",
      }
    );

    this.reconnectionTimeouts[participantId] = setTimeout(async () => {
      try {
        console.log(
          `[WebRTC Recovery] 🚀 Esecuzione tentativo ${attempt} per ${participantId}`
        );
        await this._performConnectionRecovery(participantId);

        // If we get here, recovery was successful
        console.log(
          `[WebRTC Recovery] ✅ Tentativo ${attempt} per ${participantId} completato con successo`
        );
      } catch (error) {
        console.error(
          `[WebRTC Recovery] ❌ Tentativo ${attempt} per ${participantId} fallito:`,
          error.message
        );

        // If this was not the last attempt, try again immediately
        if (attempt < this.MAX_RECONNECTION_ATTEMPTS) {
          console.warn(
            `[WebRTC Recovery] ⏭️ Preparazione tentativo successivo ${
              attempt + 1
            }/${this.MAX_RECONNECTION_ATTEMPTS} per ${participantId}`
          );
          setTimeout(() => {
            this._attemptConnectionRecovery(participantId);
          }, 500); // Short delay before next attempt
        } else {
          console.error(
            `[WebRTC Recovery] 💀 FALLIMENTO DEFINITIVO per ${participantId} dopo ${this.MAX_RECONNECTION_ATTEMPTS} tentativi`
          );
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
    console.log(
      `[WebRTC Recovery] 🔧 Eseguendo recupero connessione per ${participantId}`
    );

    const pc = this.peerConnections[participantId];
    if (!pc) {
      throw new Error(
        `PeerConnection per ${participantId} non trovata durante il recupero`
      );
    }

    const currentAttempt = this.reconnectionAttempts[participantId];
    this._reportConnectionEvent(participantId, "recovery_attempt_started", {
      attempt: currentAttempt,
    });

    // Strategy 1: Try ICE restart first (attempt 1)
    if (currentAttempt === 1) {
      try {
        console.log(
          `[WebRTC Recovery] 🧊 Tentativo ICE restart per ${participantId} (tentativo ${currentAttempt})`
        );
        await this._performICERestart(participantId);

        // Wait for connection to stabilize
        await this._waitForConnectionStabilization(participantId, 10000);

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          console.log(
            `[WebRTC Recovery] ✅ ICE restart riuscito per ${participantId}`
          );
          this._reportConnectionEvent(
            participantId,
            "recovery_ice_restart_success"
          );
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error("ICE restart non ha migliorato la connessione");
      } catch (error) {
        console.warn(
          `[WebRTC Recovery] ⚠️ ICE restart fallito per ${participantId}:`,
          error.message
        );
        throw error;
      }
    }

    // Strategy 2: If ICE restart failed, try renegotiation (attempt 2)
    if (currentAttempt === 2) {
      try {
        console.log(
          `[WebRTC Recovery] 🔄 Tentativo rinegoziazione per ${participantId} (tentativo ${currentAttempt})`
        );
        await this._safeRenegotiate(participantId);

        await this._waitForConnectionStabilization(participantId, 10000);

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          console.log(
            `[WebRTC Recovery] ✅ Rinegoziazione riuscita per ${participantId}`
          );
          this._reportConnectionEvent(
            participantId,
            "recovery_renegotiation_success"
          );
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error("Rinegoziazione non ha migliorato la connessione");
      } catch (error) {
        console.warn(
          `[WebRTC Recovery] ⚠️ Rinegoziazione fallita per ${participantId}:`,
          error.message
        );
        throw error;
      }
    }

    // Strategy 3: Last resort - recreate connection completely (attempt 3)
    if (currentAttempt === 3) {
      try {
        console.log(
          `[WebRTC Recovery] 🆕 Tentativo ricreazione connessione per ${participantId} (tentativo ${currentAttempt})`
        );
        await this._recreateConnection(participantId);

        await this._waitForConnectionStabilization(participantId, 15000);

        const newPc = this.peerConnections[participantId];
        if (
          newPc &&
          (newPc.iceConnectionState === "connected" ||
            newPc.iceConnectionState === "completed")
        ) {
          console.log(
            `[WebRTC Recovery] ✅ Ricreazione connessione riuscita per ${participantId}`
          );
          this._reportConnectionEvent(
            participantId,
            "recovery_recreation_success"
          );
          this.reconnectionAttempts[participantId] = 0; // Reset on success
          return;
        }
        throw new Error("Ricreazione connessione non è riuscita");
      } catch (error) {
        console.error(
          `[WebRTC Recovery] ❌ Ricreazione connessione fallita per ${participantId}:`,
          error.message
        );
        throw error;
      }
    }

    // If we get here, all strategies failed
    throw new Error(
      `Tutte le strategie di recupero fallite per ${participantId} (tentativo ${currentAttempt})`
    );
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

    console.log(
      `[WebRTC Recovery] ICE restart offer inviato per ${participantId}`
    );
  }
  /**
   * Rinegoziazione sicura per evitare collisioni
   * @param {string} participantId
   */
  async _safeRenegotiate(participantId) {
    // Avoid multiple simultaneous negotiations
    if (this.negotiationInProgress[participantId]) {
      console.log(
        `[WebRTC Recovery] Rinegoziazione già in corso per ${participantId}`
      );
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
    console.log(
      `[WebRTC Recovery] 🔨 Ricreazione completa connessione per ${participantId}`
    );

    // Store user data before destroying connection
    const userData = this.userData[participantId];
    if (!userData) {
      throw new Error(
        `Dati utente per ${participantId} non trovati per la ricreazione`
      );
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
      this.remoteStreams[participantId]
        .getTracks()
        .forEach((track) => track.stop());
      delete this.remoteStreams[participantId];
    }

    console.log(
      `[WebRTC Recovery] 🧹 Pulizia completata per ${participantId}, ricreazione in corso...`
    );

    // Wait a moment before recreating
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Recreate the connection with stored user data
    const newPc = this.createPeerConnection(userData);
    if (!newPc) {
      throw new Error(
        `Impossibile ricreare PeerConnection per ${participantId}`
      );
    }

    console.log(
      `[WebRTC Recovery] 🆕 Nuova PeerConnection creata per ${participantId}`
    );

    // Start the connection process as initiator
    await this.createOffer(participantId);

    console.log(
      `[WebRTC Recovery] 📤 Nuova offerta inviata per connessione ricreata di ${participantId}`
    );
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
        reject(
          new Error(
            `Timeout waiting for connection stabilization for ${participantId}`
          )
        );
      }, timeout);

      const checkConnection = () => {
        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          clearTimeout(timeoutId);
          pc.removeEventListener("iceconnectionstatechange", checkConnection);
          resolve();
        } else if (pc.iceConnectionState === "failed") {
          clearTimeout(timeoutId);
          pc.removeEventListener("iceconnectionstatechange", checkConnection);
          reject(
            new Error(
              `Connection failed during stabilization for ${participantId}`
            )
          );
        }
      };

      pc.addEventListener("iceconnectionstatechange", checkConnection);

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
    const userInfo = userData
      ? `${userData.handle} (${participantId})`
      : participantId;

    // Log critico per debug
    console.error(`\n========================================`);
    console.error(`❌ CONNESSIONE WEBRTC FALLITA DEFINITIVAMENTE`);
    console.error(`========================================`);
    console.error(`👤 Utente: ${userInfo}`);
    console.error(
      `🔢 Tentativi effettuati: ${attemptCount}/${this.MAX_RECONNECTION_ATTEMPTS}`
    );
    console.error(
      `⏰ Tempo trascorso: ${
        Date.now() - (this.connectionTimestamps[participantId] || Date.now())
      }ms`
    );
    console.error(
      `🏥 Ultimo stato salutare: ${
        this.lastKnownGoodStates[participantId]
          ? new Date(this.lastKnownGoodStates[participantId]).toISOString()
          : "Mai connesso"
      }`
    );

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

    this._reportConnectionEvent(
      participantId,
      "connection_failed_permanently",
      {
        attempts: attemptCount,
        maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
        duration:
          Date.now() - (this.connectionTimestamps[participantId] || Date.now()),
        lastGoodConnection: this.lastKnownGoodStates[participantId],
      }
    );

    // Clean up connection tracking
    this._clearConnectionTracking(participantId);

    // Close the failed connection
    this.closePeerConnection(participantId);

    // Notify UI about the permanent failure with more context
    if (this.onPeerConnectionStateChange) {
      this.onPeerConnectionStateChange(participantId, "failed_permanently", {
        reason: "max_reconnection_attempts_exceeded",
        attempts: attemptCount,
        userInfo: userInfo,
      });
    }

    // Optional: You could emit a specific event for permanent failures
    eventEmitter.emit("webrtc_connection_permanently_failed", {
      participantId,
      userInfo,
      attempts: attemptCount,
      reason: "Connessione fallita dopo tutti i tentativi di riconnessione",
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
    console.log(
      `[WebRTC ICE] Candidato ICE messo in coda per ${participantId}. Coda: ${this.iceCandidateQueues[participantId].length}`
    );
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

    console.log(
      `[WebRTC ICE] Processando ${queue.length} candidati ICE in coda per ${participantId}`
    );

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
        console.log(
          `[WebRTC ICE] Candidato ICE processato dalla coda per ${participantId}`
        );
      } catch (error) {
        console.error(
          `[WebRTC ICE] Errore processando candidato dalla coda per ${participantId}:`,
          error
        );
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
    console.log(
      `[WebRTC Cleanup] Pulizia tracking connessione per ${participantId}`
    );

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
        userHandle: userData?.handle || "Unknown",
        connectionExists: !!pc,
        connectionState: pc?.connectionState || "N/A",
        iceConnectionState: pc?.iceConnectionState || "N/A",
        signalingState: pc?.signalingState || "N/A",
        iceGatheringState: pc?.iceGatheringState || "N/A",
        reconnectionAttempts: this.reconnectionAttempts[participantId] || 0,
        maxAttempts: this.MAX_RECONNECTION_ATTEMPTS,
        connectionAge: this.connectionTimestamps[participantId]
          ? Math.round(
              (currentTime - this.connectionTimestamps[participantId]) / 1000
            )
          : 0,
        lastGoodConnection: this.lastKnownGoodStates[participantId]
          ? Math.round(
              (currentTime - this.lastKnownGoodStates[participantId]) / 1000
            )
          : null,
        queuedCandidates: this.iceCandidateQueues[participantId]?.length || 0,
        negotiationInProgress:
          this.negotiationInProgress[participantId] || false,
        hasRemoteStream: !!this.remoteStreams[participantId],
        remoteStreamTracks:
          this.remoteStreams[participantId]?.getTracks()?.length || 0,
      };
    } else {
      // Return stats for all connections
      const allStats = {};
      Object.keys(this.peerConnections).forEach((id) => {
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
        reconnectionBaseDelay: this.RECONNECTION_BASE_DELAY,
      };
    }
  }

  /**
   * Stampa un report dettagliato delle connessioni per debugging
   */
  printConnectionReport() {
    console.log("\n🔍 ===== WEBRTC CONNECTION REPORT =====");
    const stats = this.getConnectionStats();

    console.log(`👤 My ID: ${stats.myId}`);
    console.log(`💬 Chat ID: ${stats.chatId}`);
    console.log(
      `🎤 Local Stream: ${
        stats.hasLocalStream ? `✅ (${stats.localStreamTracks} tracks)` : "❌"
      }`
    );
    console.log(`🔗 Total Connections: ${stats.totalConnections}`);
    console.log(`⚙️ Health Check Interval: ${stats.healthCheckInterval}ms`);
    console.log(
      `🔄 Max Reconnection Attempts: ${stats.maxReconnectionAttempts}`
    );

    if (stats.totalConnections === 0) {
      console.log("📭 No active connections");
    } else {
      console.log("\n📊 CONNECTION DETAILS:");
      Object.entries(stats.connections).forEach(([id, conn]) => {
        console.log(`\n👥 ${conn.userHandle} (${id}):`);
        console.log(
          `   🔗 Connection: ${conn.connectionState} | ICE: ${conn.iceConnectionState}`
        );
        console.log(
          `   📡 Signaling: ${conn.signalingState} | ICE Gathering: ${conn.iceGatheringState}`
        );
        console.log(
          `   🔄 Reconnection: ${conn.reconnectionAttempts}/${conn.maxAttempts}`
        );
        console.log(
          `   ⏰ Age: ${conn.connectionAge}s | Last Good: ${
            conn.lastGoodConnection
              ? conn.lastGoodConnection + "s ago"
              : "Never"
          }`
        );
        console.log(
          `   📺 Remote Stream: ${
            conn.hasRemoteStream
              ? `✅ (${conn.remoteStreamTracks} tracks)`
              : "❌"
          }`
        );
        console.log(
          `   📋 Queued Candidates: ${conn.queuedCandidates} | Negotiating: ${
            conn.negotiationInProgress ? "✅" : "❌"
          }`
        );
      });
    }

    console.log("===== END REPORT =====\n");
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
    this._reportConnectionEvent(senderId, "offer_received");
    this._logConnectionDebugInfo(senderId, "offer_processing");

    if (pc.signalingState === "closed") {
      console.warn("[WebRTC Offer] Cannot handle offer, connection is closed");
      this._reportConnectionEvent(senderId, "offer_rejected_connection_closed");
      return;
    }

    // Instead of restricting to very specific states, just proceed with handling the SDP
    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: message.sdp })
      );
      console.log(
        `[WebRTC Offer] ✅ Remote description (offer) from ${senderId} set.`
      );
      this._reportConnectionEvent(senderId, "offer_remote_description_set");

      // Process any queued ICE candidates now that remote description is set
      await this._processQueuedICECandidates(senderId);

      await this.createAnswer(senderId);
    } catch (error) {
      console.error(
        `[WebRTC Offer] ❌ Error handling offer from ${senderId}:`,
        error
      );
      this._reportConnectionEvent(
        senderId,
        "offer_handling_failed",
        error.message
      );

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
    this._reportConnectionEvent(senderId, "answer_received");
    this._logConnectionDebugInfo(senderId, "answer_processing");

    if (!(pc.signalingState === "have-local-offer")) {
      console.warn(
        `[WebRTC Answer] Impossibile gestire risposta, signalingState=${pc.signalingState}`
      );
      this._reportConnectionEvent(
        senderId,
        "answer_rejected_wrong_signaling_state",
        pc.signalingState
      );
      return;
    }

    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: message.sdp })
      );
      console.log(
        `[WebRTC Answer] ✅ Descrizione remota (risposta) da ${senderId} impostata.`
      );
      this._reportConnectionEvent(senderId, "answer_remote_description_set");

      // Process any queued ICE candidates now that remote description is set
      await this._processQueuedICECandidates(senderId);

      // Clear negotiation flag on successful answer
      this.negotiationInProgress[senderId] = false;

      // Connessione SDP stabilita con 'senderId'
    } catch (error) {
      console.error(
        `[WebRTC Answer] ❌ Error handling answer from ${senderId}:`,
        error
      );
      this._reportConnectionEvent(
        senderId,
        "answer_handling_failed",
        error.message
      );

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
            foundation: message.candidate.foundation,
          }
        );

        this._reportConnectionEvent(participantId, "ice_candidate_received", {
          type: message.candidate.type,
          protocol: message.candidate.protocol,
        });

        const candidate = new RTCIceCandidate(message.candidate);

        // Check if remote description is set, if not queue the candidate
        if (!pc.remoteDescription) {
          console.log(
            `[WebRTC ICE] Remote description non ancora impostata per ${participantId}, metto candidato in coda`
          );
          this._queueICECandidate(participantId, candidate);
          return;
        }

        // Try to add the candidate with retry logic for Android
        let retryCount = 0;
        const maxRetries = Platform.OS === "android" ? 3 : 1;

        while (retryCount < maxRetries) {
          try {
            await pc.addIceCandidate(candidate);
            console.log(
              `[WebRTC ICE] ✅ Candidato ICE aggiunto con successo per ${participantId}`
            );
            this._reportConnectionEvent(
              participantId,
              "ice_candidate_added_successfully"
            );
            break;
          } catch (error) {
            retryCount++;
            console.warn(
              `[WebRTC ICE] ⚠️ Tentativo ${retryCount}/${maxRetries} fallito per candidato ICE di ${participantId}:`,
              error
            );

            if (retryCount < maxRetries) {
              // Wait before retry (exponential backoff)
              await new Promise((resolve) =>
                setTimeout(resolve, 100 * Math.pow(2, retryCount))
              );
            } else {
              console.error(
                `[WebRTC ICE] ❌ Tutti i tentativi falliti per candidato ICE di ${participantId}`
              );
              this._reportConnectionEvent(
                participantId,
                "ice_candidate_failed",
                error.message
              );
              throw error;
            }
          }
        }
      } else {
        console.log(`[WebRTC ICE] Fine candidati ICE per ${participantId}`);
        this._reportConnectionEvent(participantId, "ice_candidates_complete");
        await pc.addIceCandidate(null);
      }
    } catch (error) {
      console.error(
        `[WebRTC ICE] Errore aggiunta candidato ICE per ${participantId}:`,
        error
      );
      this._reportConnectionEvent(
        participantId,
        "ice_candidate_error",
        error.message
      );

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
      
      // Clear pin if this user was pinned
      this.clearPinIfUser(leavingUserId);
      
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
   */ closeAllConnections() {
    console.log("MultiPeerWebRTCManager: Chiusura di tutte le connessioni...");

    // Close all screen share streams first
    if (this.screenStreams) {
      Object.keys(this.screenStreams).forEach((streamId) => {
        const stream = this.screenStreams[streamId];
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      });
      this.screenStreams = {};
      this.screenStreamCounter = 0;
    }

    // Clean up remote screen streams
    this.remoteScreenStreams = {};
    this.remoteStreamMetadata = {}; // Chiudi tutte le connessioni peer
    Object.keys(this.peerConnections).forEach((participantId) => {
      this.closePeerConnection(participantId); // Usa il metodo esistente per pulire singolarmente
    });
    this.peerConnections = {}; // Assicura che l'oggetto sia vuoto
    // Note: We're not clearing userData in closeAllConnections anymore since regenerate handles that

    // Pulisci gli stream remoti rimasti (dovrebbero essere già stati rimossi da closePeerConnection)
    this.remoteStreams = {};

    // Clear all connection tracking
    this.connectionStates = {};
    this.connectionTimestamps = {};
    this.reconnectionAttempts = {};
    this.lastKnownGoodStates = {};
    this.iceCandidateQueues = {};
    this.negotiationInProgress = {};

    // Clear health checkers and timeouts
    Object.values(this.connectionHealthCheckers).forEach((checker) => {
      if (checker) clearInterval(checker);
    });
    this.connectionHealthCheckers = {};

    Object.values(this.reconnectionTimeouts).forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });
    this.reconnectionTimeouts = {};

    // Resetta ID
    this.myId = null;    // Resetta chat ID
    this.chatId = null;

    // Clear pin state when leaving vocal chat
    this.pinnedUserId = null;

    // Disabilito gli event listeners non più necessari (candidate, offer, answer sono utili solo quando sei in una comms)
    this._removeEventListeners();
    this._cleanupEventReceiver();

    console.log(
      "MultiPeerWebRTCManager: Tutte le connessioni chiuse e risorse rilasciate."
    );

    // Notify UI about cleanup
    this.notifyStreamUpdate();
  }

  /**
   * Forza manualmente un tentativo di riconnessione per un partecipante specifico
   * Utile per testing o per interfacce utente che permettono retry manuali
   * @param {string} participantId
   * @returns {boolean} True se il tentativo è stato avviato, false se non possibile
   */
  async forceReconnection(participantId) {
    if (!participantId || !this.peerConnections[participantId]) {
      console.warn(
        `[WebRTC Manual] Impossibile forzare riconnessione: partecipante ${participantId} non trovato`
      );
      return false;
    }

    const currentAttempts = this.reconnectionAttempts[participantId] || 0;
    if (currentAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      console.warn(
        `[WebRTC Manual] Impossibile forzare riconnessione: tentativi massimi raggiunti per ${participantId} (${currentAttempts}/${this.MAX_RECONNECTION_ATTEMPTS})`
      );
      return false;
    }

    console.log(
      `[WebRTC Manual] 🔄 Forzando riconnessione manuale per ${participantId}`
    );

    // Reset some tracking to allow manual retry
    if (this.reconnectionTimeouts[participantId]) {
      clearTimeout(this.reconnectionTimeouts[participantId]);
      delete this.reconnectionTimeouts[participantId];
    }

    try {
      await this._attemptConnectionRecovery(participantId);
      return true;
    } catch (error) {
      console.error(
        `[WebRTC Manual] Errore durante riconnessione forzata per ${participantId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Reset dei contatori di riconnessione per un partecipante (per testing o recovery manual)
   * @param {string} participantId
   */
  resetReconnectionAttempts(participantId) {
    if (participantId) {
      console.log(
        `[WebRTC Manual] 🔄 Reset contatori riconnessione per ${participantId}`
      );
      this.reconnectionAttempts[participantId] = 0;

      // Clear any pending timeouts
      if (this.reconnectionTimeouts[participantId]) {
        clearTimeout(this.reconnectionTimeouts[participantId]);
        delete this.reconnectionTimeouts[participantId];
      }
    } else {
      console.log(
        `[WebRTC Manual] 🔄 Reset contatori riconnessione per tutti i partecipanti`
      );
      this.reconnectionAttempts = {};

      // Clear all pending timeouts
      Object.values(this.reconnectionTimeouts).forEach((timeout) =>
        clearTimeout(timeout)
      );
      this.reconnectionTimeouts = {};
    }
  }
  async regenerate(
    myId,
    chatId,
    onLocalStreamReady,
    onPeerConnectionStateChange,
    onParticipantLeft
  ) {
    // Store existing users to reconnect with them later
    // Note: we don't use API methods here because we already have the data
    const existingUsersData = Object.values(this.userData);

    // Prima pulisci tutte le connessioni esistenti
    this.closeAllConnections();

    // Reinizializza tutte le proprietà
    this.myId = myId;
    this.chatId = chatId; // Set chatId first
    this.onLocalStreamReady = onLocalStreamReady;
    this.onPeerConnectionStateChange = onPeerConnectionStateChange;
    this.onParticipantLeft = onParticipantLeft;
    this.peerConnections = {};
    this.remoteStreams = {};
    this._setupEventListeners();
    this._initializeEventReceiver();

    console.log(`MultiPeerWebRTCManager: Rigenerato per l'utente ${myId}`);

    // Reconnect with existing users
    if (existingUsersData && existingUsersData.length > 0) {
      console.log(
        `MultiPeerWebRTCManager: Riconnessione con ${existingUsersData.length} utenti esistenti...`
      );
      setTimeout(async () => {
        for (const userData of existingUsersData) {
          // Skip if it's ourselves
          if (userData.from === myId) continue;

          console.log(
            `MultiPeerWebRTCManager: Riconnessione con utente ${userData.handle}...`
          );
          await this.connectToNewParticipant(userData);
        }
      }, 500); // Small delay to ensure everything is ready
    }
  }
  // ===== SCREEN SHARING FUNCTIONALITY =====
  /**
   * Start a new screen sharing stream
   * @param {string} screenShareId - The screen share ID from the API
   * @param {MediaStream} existingStream - Optional existing screen stream (if permission already granted)
   * @returns {Object} { streamId, stream } or null if failed
   */  async addScreenShareStream(screenShareId, existingStream = null) {
    try {
      let screenStream = existingStream;
      
      // If no existing stream provided, get one
      if (!screenStream) {
        if (Platform.OS === "web") {
          try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: { ideal: 16 / 9 },
              },
              audio: true, // Include system audio if available
            });
          } catch (permissionError) {
            // Handle permission denied gracefully
            if (permissionError.name === "NotAllowedError" || 
                permissionError.message.includes("Permission denied") ||
                permissionError.message.includes("cancelled by user")) {
              console.log("Screen share permission denied by user - silently ignoring");
              return null; // Return null instead of throwing, so the UI can stay in previous state
            }
            throw permissionError; // Re-throw other errors
          }
        } else {
          // For Android, use proper screen capture implementation
          try {
            // Method 1: Try react-native-webrtc's built-in screen capture
            if (mediaDevices.getDisplayMedia) {
              try {
                console.log(
                  "[Android] Attempting getDisplayMedia screen capture"
                );
                screenStream = await mediaDevices.getDisplayMedia({
                  video: {
                    width: { ideal: 1920, min: 720, max: 1920 },
                    height: { ideal: 1080, min: 480, max: 1080 },
                    frameRate: { ideal: 15, max: 30 },
                  },
                  audio: false, // Audio capture often causes issues on Android
                });
                console.log("[Android] getDisplayMedia successful");
              } catch (displayError) {
                // Handle permission denied gracefully
                if (displayError.name === "NotAllowedError" || 
                    displayError.message.includes("Permission denied") ||
                    displayError.message.includes("cancelled by user")) {
                  console.log("Screen share permission denied by user - silently ignoring");
                  return null;
                }
                console.warn(
                  "[Android] getDisplayMedia failed:",
                  displayError.message
                );
                screenStream = null;
              }
            }

            // Method 2: Try react-native-webrtc's getUserMedia with screen source
            if (!screenStream && mediaDevices.getUserMedia) {
              try {
                console.log(
                  "[Android] Attempting getUserMedia with screen source"
                );
                screenStream = await mediaDevices.getUserMedia({
                  video: {
                    mandatory: {
                      chromeMediaSource: "screen",
                      maxWidth: 1920,
                      maxHeight: 1080,
                      maxFrameRate: 15,
                    },
                  },
                  audio: false,
                });
                console.log(
                  "[Android] getUserMedia with screen source successful"
                );
              } catch (screenError) {
                // Handle permission denied gracefully
                if (screenError.name === "NotAllowedError" || 
                    screenError.message.includes("Permission denied") ||
                    screenError.message.includes("cancelled by user")) {
                  console.log("Screen share permission denied by user - silently ignoring");
                  return null;
                }
                console.warn(
                  "[Android] getUserMedia with screen source failed:",
                  screenError.message
                );
                screenStream = null;
              }
            }

            // Method 3: Fallback to high-quality camera stream with proper labeling
            if (!screenStream) {
              console.log("[Android] Using camera fallback for screen sharing");
              try {
                screenStream = await mediaDevices.getUserMedia({
                  video: {
                    width: { ideal: 1920, min: 720 },
                    height: { ideal: 1080, min: 480 },
                    frameRate: { ideal: 30, min: 15 },
                    facingMode: { ideal: "environment" }, // Back camera typically better quality
                  },
                  audio: false,
                });
                console.log("[Android] Camera fallback successful");
              } catch (cameraError) {
                // Handle permission denied gracefully
                if (cameraError.name === "NotAllowedError" || 
                    cameraError.message.includes("Permission denied") ||
                    cameraError.message.includes("cancelled by user")) {
                  console.log("Camera permission denied by user - silently ignoring");
                  return null;
                }
                console.error(
                  "[Android] All screen sharing methods failed:",
                  cameraError.message
                );
                throw new Error(
                  `Screen sharing not available: ${cameraError.message}`
                );
              }
            }

            if (!screenStream) {
              throw new Error(
                "Failed to obtain screen capture stream on Android"
              );
            }
          } catch (error) {
            // Handle permission denied gracefully at top level
            if (error.name === "NotAllowedError" || 
                error.message.includes("Permission denied") ||
                error.message.includes("cancelled by user")) {
              console.log("Screen share permission denied by user - silently ignoring");
              return null;
            }
            console.error("[Android] Error starting screen share:", error);
            throw new Error(`Android screen sharing failed: ${error.message}`);
          }
        }
      }

      // Use the provided screen share ID instead of generating our own
      const streamId = screenShareId || `screen_${this.screenStreamCounter++}`;
      this.screenStreams[streamId] = screenStream;

      if (Platform.OS === "web") {
        // Add screen share tracks to all peer connections
        for (const [peerId, pc] of Object.entries(this.peerConnections)) {
          if (
            pc.connectionState === "connected" ||
            pc.connectionState === "connecting"
          ) {
            try {
              screenStream.getTracks().forEach((track) => {
                // Add a custom property to identify this as a screen share track
                track.streamId = streamId;
                track.streamType = "screenshare";
                pc.addTrack(track, screenStream);
              });
            } catch (error) {
              console.error(
                `Error adding screen share tracks to peer ${peerId}:`,
                error
              );
            }
          }
        }        // Listen for when user stops screen sharing via browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
          // Call API to stop screen share
          try {
            await APIMethods.stopScreenShare(this.chatId, streamId);
          } catch (error) {
            console.error("Error calling stopScreenShare API:", error);
          }
          this.removeScreenShareStream(streamId);
        };
        console.log(`Screen share stream ${streamId} started successfully`);
      } else {
        // Android implementation
        // Add screen share tracks to all peer connections
        for (const [peerId, pc] of Object.entries(this.peerConnections)) {
          if (
            pc.connectionState === "connected" ||
            pc.connectionState === "connecting"
          ) {
            try {
              screenStream.getTracks().forEach((track) => {
                // Mark track with metadata for proper identification
                track.streamId = streamId;
                track.streamType = "screenshare";
                track.label = `screen-share-${streamId}`;
                pc.addTrack(track, screenStream);
              });
            } catch (error) {
              console.error(
                `Error adding screen share tracks to peer ${peerId}:`,
                error
              );
            }
          }
        }        // Handle stream end event
        screenStream.getVideoTracks().forEach((track) => {
          track.onended = async () => {
            console.log(`[Android] Screen share track ended: ${streamId}`);
            // Call API to stop screen share
            try {
              await APIMethods.stopScreenShare(this.chatId, streamId);
            } catch (error) {
              console.error("Error calling stopScreenShare API:", error);
            }
            this.removeScreenShareStream(streamId);
          };
        });

        console.log(
          `[Android] Screen share stream ${streamId} started successfully`
        );
      }

      // Send signaling message to notify other participants
      if (this.chatId && WebSocketMethods.sendScreenShareStarted) {
        await WebSocketMethods.sendScreenShareStarted(
          this.chatId,
          this.myId,
          streamId
        );
      }

      // Notify UI components
      this.notifyStreamUpdate();

      // Renegotiate with all peers
      setTimeout(async () => {
        await this.renegotiateWithAllPeers();
      }, 100);

      return { streamId, stream: screenStream };
    } catch (error) {
      console.error("Error starting screen share:", error);
      throw error;
    }
  }

  /**
   * Remove a specific screen sharing stream
   * @param {string} streamId - The ID of the screen share stream to remove
   */
  async removeScreenShareStream(streamId) {
    const screenStream = this.screenStreams[streamId];
    if (!screenStream) {
      console.warn(`Screen share stream ${streamId} not found`);
      return;
    }

    try {
      // Stop all tracks in the screen stream
      screenStream.getTracks().forEach((track) => {
        track.stop();
      });

      // Remove screen share tracks from all peer connections
      for (const [peerId, pc] of Object.entries(this.peerConnections)) {
        if (
          pc.connectionState === "connected" ||
          pc.connectionState === "connecting"
        ) {
          const senders = pc.getSenders();
          for (const sender of senders) {
            if (sender.track && sender.track.streamId === streamId) {
              try {
                await pc.removeTrack(sender);
              } catch (error) {
                console.error(
                  `Error removing screen share track from peer ${peerId}:`,
                  error
                );
              }
            }
          }
        }
      } // Remove from our collection
      delete this.screenStreams[streamId];

      console.log(`Screen share stream ${streamId} removed successfully`);

      // Send WebSocket signaling to notify other participants
      if (this.chatId && WebSocketMethods.sendScreenShareStopped) {
        await WebSocketMethods.sendScreenShareStopped(
          this.chatId,
          this.myId,
          streamId
        );
      }

      // Notify UI components
      this.notifyStreamUpdate();

      // Renegotiate with all peers
      setTimeout(async () => {
        await this.renegotiateWithAllPeers();
      }, 100);
    } catch (error) {
      console.error(`Error removing screen share stream ${streamId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active screen share streams
   * @returns {Object} Object containing all screen share streams
   */
  getScreenShareStreams() {
    return { ...this.screenStreams };
  }

  /**
   * Check if any screen sharing is active
   * @returns {boolean} True if at least one screen share is active
   */
  hasActiveScreenShare() {
    return Object.keys(this.screenStreams).length > 0;
  }

  /**
   * Remove all screen sharing streams
   */  async removeAllScreenShareStreams() {
    const streamIds = Object.keys(this.screenStreams);
    for (const streamId of streamIds) {
      await this.removeScreenShareStream(streamId);
    }
  }

  // ===== PIN MANAGEMENT =====
    /**
   * Set the pinned rectangle ID (can be user ID or screen share ID)
   * @param {string|null} rectangleId - The rectangle ID to pin, or null to unpin
   */
  setPinnedUser(rectangleId) {
    // Allow pinning any rectangle ID that could be rendered:
    // 1. User IDs (participant IDs)
    // 2. Screen share IDs (from any user)
    // 3. Local user ID (self)
    if (rectangleId !== null) {      const isValidRectangle = 
        // Check if it's a regular user ID in the chat
        this.userData[rectangleId] ||
        // Check if it's the local user ID (self)
        rectangleId === this.myId ||
        // Check if it's a screen share ID from any user
        Object.values(this.userData).some(user => 
          user.active_screen_share && user.active_screen_share.includes(rectangleId)
        ) ||
        // Check if it's a local screen share ID
        this.screenStreams && Object.keys(this.screenStreams).includes(rectangleId) ||
        // Check if it's a remote screen share ID
        Object.values(this.remoteScreenStreams || {}).some(userScreenShares =>
          Object.keys(userScreenShares).includes(rectangleId)
        ) ||
        // Allow screen share IDs that look like screen share format (more permissive for placeholders)
        (typeof rectangleId === 'string' && rectangleId.includes('screen_'));
      
      if (!isValidRectangle) {
        console.warn(`Cannot pin rectangle ${rectangleId}: not found in current chat or screen shares`);
        return false;
      }
    }
    
    const previousPinned = this.pinnedUserId;
    this.pinnedUserId = rectangleId;
    
    console.log(`Pin state changed: ${previousPinned} -> ${rectangleId}`);
    return true;
  }
    /**
   * Get the currently pinned rectangle ID
   * @returns {string|null} The pinned rectangle ID or null if no rectangle is pinned
   */
  getPinnedUser() {
    return this.pinnedUserId;
  }
  
  /**
   * Toggle pin state for a rectangle
   * @param {string} rectangleId - The rectangle ID to toggle pin for (user ID or screen share ID)
   * @returns {boolean} True if pinning was successful, false otherwise
   */
  togglePinUser(rectangleId) {
    if (this.pinnedUserId === rectangleId) {
      // Unpin if already pinned
      return this.setPinnedUser(null);
    } else {
      // Pin the rectangle
      return this.setPinnedUser(rectangleId);
    }
  }
  
  /**
   * Clear pinned rectangle if it matches the specified ID
   * @param {string} rectangleId - The rectangle ID that should be unpinned if currently pinned
   */
  clearPinIfUser(rectangleId) {
    if (this.pinnedUserId === rectangleId) {
      console.log(`Clearing pin for rectangle ${rectangleId} (rectangle removed or unavailable)`);
      this.pinnedUserId = null;
    }
  }
}

let multiPeerWebRTCManager = new MultiPeerWebRTCManager();
export default multiPeerWebRTCManager;
