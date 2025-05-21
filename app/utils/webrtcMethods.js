import WebSocketMethods from "./webSocketMethods";
import { Platform } from "react-native";
import eventEmitter from "./EventEmitter";

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

  // --- Callback UI aggiornate ---
  onLocalStreamReady = null;
  // Chiamata quando un nuovo stream remoto viene aggiunto o uno esistente viene aggiornato
  onRemoteStreamAddedOrUpdated = null;
  // Chiamata quando lo stato di una specifica connessione peer cambia
  onPeerConnectionStateChange = null;
  // Chiamata quando un partecipante lascia (la sua connessione viene chiusa)
  onParticipantLeft = null;

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
  }

  // Gestione degli eventi

  _setupEventListeners() {
    // Rimuovi eventuali listener precedenti
    this._removeEventListeners();
    
    // Aggiungi i listener per i vari tipi di messaggi
    eventEmitter.on('offer', this.offerMessage.bind(this));
    eventEmitter.on('answer', this.answerMessage.bind(this));
    eventEmitter.on('candidate', this.candidateMessage.bind(this));
    
    console.log('MultiPeerWebRTCManager: Event listeners configurati');
  }

  // Metodo per rimuovere gli event listeners
  _removeEventListeners() {
    eventEmitter.off('offer', this.offerMessage.bind(this));
    eventEmitter.off('answer', this.answerMessage.bind(this));
    eventEmitter.off('candidate', this.candidateMessage.bind(this));
  }


  /**
   * Inizia l'acquisizione dello stream locale (invariato)
   */
  async startLocalStream() {
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
        video: {
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
   * Crea e configura una RTCPeerConnection PER UN SINGOLO PARTECIPANTE REMOTO.
   * @param {string} participantId - L'ID univoco del partecipante remoto.
   * @returns {RTCPeerConnection} La connessione creata.
   */
  createPeerConnection(participant) {
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
      console.log("a1", userData);
      this.peerConnections[participantId] = pc; // Memorizza la connessione
      this.userData[participantId] = userData;
      // --- Gestione Eventi Specifica per questa Connessione ---

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          // Invia il candidato SPECIFICATAMENTE a questo partecipante
          console.log(
            `MultiPeerWebRTCManager: Invio candidato ICE a ${participantId}`
          );
          await WebSocketMethods.IceCandidate({
            candidate: event.candidate.toJSON(),
            to: participantId,
            from: this.myId,
          });
        }
      };

      // In webrtcMethods.js, inside createPeerConnection method
      pc.ontrack = (event) => {
        console.log(
          `Got remote track from ${participantId}:`,
          event.track.kind
        );

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
      };

      pc.oniceconnectionstatechange = (event) => {
        const newState = pc.iceConnectionState;
        console.log(
          `MultiPeerWebRTCManager: ICE connection state for ${participantId}: ${newState}`
        );

        if (this.onPeerConnectionStateChange) {
          this.onPeerConnectionStateChange(participantId, newState);
        }

        // Enhanced state handling
        switch (newState) {
          case "connected":
          case "completed":
            // Connection established successfully
            // this._clearConnectionTimeout(participantId);
            console.log(
              `Connection to ${participantId} established successfully`
            );
            break;

          case "failed":
            console.warn(`Connection to ${participantId} failed`);
            // this._reportError(
            //   "ice_connection_failed",
            //   ICE connection to ${participantId} failed,
            //   null,
            //   participantId
            // );
            break;

          case "disconnected":
            console.warn(`Connection to ${participantId} disconnected`);
            // Start a reconnection timeout - might recover on its own
            setTimeout(() => {
              if (pc.iceConnectionState === "disconnected") {
                // this._reportError(
                //   "connection_disconnected",
                //   Connection to ${participantId} disconnected and didn't recover,
                //   null,
                //   participantId
                // );
              }
            }, 5000); // Wait 5 seconds to see if it recovers
            break;
        }
      };

      // Aggiungi lo stream locale a QUESTA specifica connessione peer
      if (this.localStream) {
        this._addLocalTracksToPeerConnection(pc);
      } else {
        console.warn(
          `MultiPeerWebRTCManager: Attenzione - PeerConnection per ${participantId} creata senza stream locale pronto.`
        );
      }

      console.log(
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} creata.`
      );
      return pc;
    } catch (error) {
      console.error(
        `MultiPeerWebRTCManager: Errore creazione PeerConnection per ${participantId}:`,
        error
      );
      delete this.peerConnections[participantId]; // Rimuovi la connessione fallita
      return null;
    }
  }

  // aggiunge una video track allo stream
  async addVideoTrack() {
    try {
      const videoStream = await mediaDevices.getUserMedia({ video: true });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!this.localStream) {
        this.localStream = new MediaStream();
      }
      this.localStream.addTrack(videoTrack);

      // Aggiungi la traccia a tutte le peer connection
      Object.values(this.peerConnections).forEach((pc) => {
        pc.addTrack(videoTrack, this.localStream);
      });

      if (this.onLocalStreamReady) {
        this.onLocalStreamReady(this.localStream);
      }
      return videoStream;
    } catch (error) {
      console.error("Errore addVideoTrack:", error);
      throw error;
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
    console.log(`MultiPeerWebRTCManager: Gestione offerta da ${senderId}...`);

    if (pc.signalingState === "closed") {
      console.warn("Cannot handle offer, connection is closed");
      return;
    }
    // Instead of restricting to very specific states, just proceed with handling the SDP
    try {
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: message.sdp })
      );
      console.log(`Remote description (offer) from ${senderId} set.`);
      await this.createAnswer(senderId);
    } catch (error) {
      console.error(`Error handling offer:`, error);
      // this._reportError("offer_handling_failed", Failed to process offer from ${senderId}, error);
    }
  }

  async answerMessage(message) {
    console.log("Risposta arrivata");
    if (!(await this.assureMessageIsForMe(message))) {
      return;
    }
    const pc = await this.getExistingPeerConnection(message.from);
    if (!pc) {
      return;
    }
    const senderId = message.from;
    if (!message.sdp) {
      console.error("Risposta ricevuta senza SDP da", senderId);
      return;
    }
    console.log(`MultiPeerWebRTCManager: Gestione risposta da ${senderId}...`);

    if (!(pc.signalingState === "have-local-offer")) {
      console.warn(
        `MultiPeerWebRTCManager: Impossibile gestire risposta, signalingState=${pc.signalingState}`
      );
      return;
    }

    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: "answer", sdp: message.sdp })
    );
    console.log(
      `MultiPeerWebRTCManager: Descrizione remota (risposta) da ${senderId} impostata.`
    );
    // Connessione SDP stabilita con 'senderId'
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

    try {
      if (message.candidate) {
        console.log(
          `Adding ICE candidate for ${message.from}:`,
          message.candidate
        );
        await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        console.log(`ICE candidate added successfully for ${message.from}`);
      } else {
        console.log(`End of candidates for ${message.from}`);
        await pc.addIceCandidate(null);
      }
    } catch (error) {
      console.error(`Error adding ICE candidate for ${message.from}:`, error);
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

  async existingUsers(existingUsers) {
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
    this.onParticipantLeft = onParticipantLeft;

    this.peerConnections = {};
    this.remoteStreams = {};
    this._setupEventListeners();

    console.log(`MultiPeerWebRTCManager: Rigenerato per l'utente ${myId}`);
  }
}

let multiPeerWebRTCManager = new MultiPeerWebRTCManager();
export default multiPeerWebRTCManager;
