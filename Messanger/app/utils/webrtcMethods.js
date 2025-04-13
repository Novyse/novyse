import WebSocketMethods from "./webSocketMethods";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Aggiungi i tuoi server TURN se necessario
  ],
};

class MultiPeerWebRTCManager {
  myId = null; // Identificativo univoco per questo client (dovrebbe essere assegnato dal server/login)
  peerConnections = {}; // Oggetto per memorizzare le connessioni: { participantId: RTCPeerConnection }
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
    myId,
    onLocalStreamReady,
    onRemoteStreamAddedOrUpdated,
    onPeerConnectionStateChange,
    onParticipantLeft,
  ) {
    console.log(`MultiPeerWebRTCManager: Inizializzato per l'utente ${myId}`);
    if (!myId) {
      throw new Error("ID utente richiesto.");
    }
    this.myId = myId;
    this.onLocalStreamReady = onLocalStreamReady;
    this.onRemoteStreamAddedOrUpdated = onRemoteStreamAddedOrUpdated;
    this.onPeerConnectionStateChange = onPeerConnectionStateChange;
    this.onParticipantLeft = onParticipantLeft;
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
      const constraints = { audio: true, video: true }; // Semplificato
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
  createPeerConnection(participantId) {
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
      this.peerConnections[participantId] = pc; // Memorizza la connessione

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

      pc.ontrack = (event) => {
        console.log(
          `MultiPeerWebRTCManager: Ricevuto track da ${participantId}`
        );
        if (event.streams && event.streams[0]) {
          const remoteStream = event.streams[0];
          this.remoteStreams[participantId] = remoteStream; // Memorizza lo stream remoto associato all'ID
          if (this.onRemoteStreamAddedOrUpdated) {
            this.onRemoteStreamAddedOrUpdated(participantId, remoteStream);
          }
        } else if (event.track) {
          // Gestione alternativa se arriva solo la traccia
          let stream = this.remoteStreams[participantId];
          if (!stream) {
            stream = new MediaStream(undefined);
            this.remoteStreams[participantId] = stream;
          }
          stream.addTrack(event.track);
          if (this.onRemoteStreamAddedOrUpdated) {
            this.onRemoteStreamAddedOrUpdated(participantId, stream);
          }
        }
      };

      pc.oniceconnectionstatechange = (event) => {
        const newState = pc.iceConnectionState;
        console.log(
          `MultiPeerWebRTCManager: Stato connessione ICE per ${participantId}: ${newState}`
        );
        if (this.onPeerConnectionStateChange) {
          this.onPeerConnectionStateChange(participantId, newState);
        }
        if (
          newState === "failed" ||
          newState === "disconnected" ||
          newState === "closed"
        ) {
          console.warn(
            `MultiPeerWebRTCManager: Connessione con ${participantId} ${newState}. Potrebbe essere necessario chiudere.`
          );
          // Potresti voler chiudere automaticamente la connessione qui
          // this.closePeerConnection(participantId);
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

  /**
   * Helper per aggiungere tracce locali a una PeerConnection
   * @param {RTCPeerConnection} pc
   */
  _addLocalTracksToPeerConnection(pc) {
    if (!this.localStream) return;
    console.log(
      `MultiPeerWebRTCManager: Aggiunta tracce locali alla connessione per ${this._findParticipantIdByPeerConnection(
        pc
      )}`
    );
    this.localStream.getTracks().forEach((track) => {
      // Verifica se la traccia è già stata aggiunta per evitare errori
      const senders = pc.getSenders();
      const senderExists = senders.find((sender) => sender.track === track);
      if (!senderExists) {
        pc.addTrack(track, this.localStream);
        console.log(`MultiPeerWebRTCManager: Traccia ${track.kind} aggiunta.`);
      } else {
        console.log(
          `MultiPeerWebRTCManager: Traccia ${track.kind} già presente.`
        );
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
      console.error(
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} non trovata per creare offerta.`
      );
      return;
    }
    console.log(
      `MultiPeerWebRTCManager: Creazione offerta SDP per ${participantId}...`
    );
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log(
        `MultiPeerWebRTCManager: Offerta per ${participantId} creata e impostata localmente.`
      );

      await WebSocketMethods.RTCOffer({
        sdp: pc.localDescription.sdp,
        to: participantId,
        from: this.myId,
      });
    } catch (error) {
      console.error(
        `MultiPeerWebRTCManager: Errore creazione/invio offerta per ${participantId}:`,
        error
      );
    }
  }

  /**
   * Gestisce un messaggio di segnalazione ricevuto. Ora deve considerare 'from' e 'to'.
   * @param {object} message - Es: { type: 'offer', sdp: '...', from: 'peerA', to: 'myId' }
   */
  async handleSignalMessage(message) {
    // Ignora messaggi non destinati a me (anche se il server dovrebbe già filtrare)
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

    console.log(
      `MultiPeerWebRTCManager: Ricevuto messaggio "${message.type}" da ${senderId}`
    );

    // Assicurati che la connessione peer per questo mittente esista o creala se necessario (es. su offerta)
    let pc = this.peerConnections[senderId];
    if (!pc /*&&(message.type === "offer" || message.type === "candidate")*/) {
      // Se riceviamo un'offerta o un candidato da un nuovo peer, creiamo la connessione per lui
      console.log(
        `MultiPeerWebRTCManager: Creo connessione per il nuovo peer ${senderId} su ricezione ${message.type}...`
      );
      // Assicurati che lo stream locale sia pronto PRIMA di creare la connessione per un nuovo peer
      if (!this.localStream) {
        try {
          await this.startLocalStream();
        } catch (error) {
          console.error(
            `MultiPeerWebRTCManager: Impossibile avviare stream locale per gestire ${message.type} da ${senderId}`
          );
          return; // Non possiamo procedere senza stream locale
        }
      }
      pc = this.createPeerConnection(senderId);
      if (!pc) {
        console.error(
          `MultiPeerWebRTCManager: Fallimento creazione PeerConnection per ${senderId} su ricezione segnale.`
        );
        return;
      }
    } else if (!pc) {
      console.error(
        `MultiPeerWebRTCManager: Ricevuto messaggio "${message.type}" da ${senderId} ma non esiste una PeerConnection.`
      );
      return; // Non possiamo gestire risposta o candidato senza connessione esistente
    }

    try {
      switch (message.type) {
        case "offer":
          if (!message.sdp) {
            console.error("Offerta ricevuta senza SDP da", senderId);
            return;
          }
          console.log(
            `MultiPeerWebRTCManager: Gestione offerta da ${senderId}...`
          );
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: message.sdp })
          );
          console.log(
            `MultiPeerWebRTCManager: Descrizione remota (offerta) da ${senderId} impostata.`
          );
          await this.createAnswer(senderId); // Crea e invia una risposta a questo specifico peer
          break;

        case "answer":
          if (!message.sdp) {
            console.error("Risposta ricevuta senza SDP da", senderId);
            return;
          }
          console.log(
            `MultiPeerWebRTCManager: Gestione risposta da ${senderId}...`
          );
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: message.sdp })
          );
          console.log(
            `MultiPeerWebRTCManager: Descrizione remota (risposta) da ${senderId} impostata.`
          );
          // Connessione SDP stabilita con 'senderId'
          break;

        case "candidate":
          if (!message.candidate) {
            console.error("Candidato ricevuto senza dati da", senderId);
            return;
          }
          console.log(
            `MultiPeerWebRTCManager: Gestione candidato ICE da ${senderId}...`
          );
          const candidate = new RTCIceCandidate(message.candidate);
          await pc.addIceCandidate(candidate);
          console.log(
            `MultiPeerWebRTCManager: Candidato ICE da ${senderId} aggiunto.`
          );
          break;

        // --- NUOVI TIPI DI MESSAGGIO PER MULTI-PEER ---
        // Questi tipi dipendono fortemente dal tuo server di segnalazione

        case "user-joined":
          // Un nuovo utente (message.userId) è entrato nella stanza
          const newUserId = message.userId;
          if (
            newUserId &&
            newUserId !== this.myId &&
            !this.peerConnections[newUserId]
          ) {
            console.log(
              `MultiPeerWebRTCManager: Utente ${newUserId} entrato. Inizio connessione...`
            );
            await this.connectToNewParticipant(newUserId);
          }
          break;

        case "user-left":
          // Un utente (message.userId) ha lasciato la stanza
          const leavingUserId = message.userId;
          if (leavingUserId && leavingUserId !== this.myId) {
            console.log(
              `MultiPeerWebRTCManager: Utente ${leavingUserId} uscito. Chiudo la connessione...`
            );
            this.closePeerConnection(leavingUserId);
          }
          break;

        case "existing-users":
          // Ricevuto elenco di utenti (message.users: array di ID) già presenti nella stanza
          const existingUsers = message.users || [];
          console.log(
            `MultiPeerWebRTCManager: Utenti esistenti nella stanza:`,
            existingUsers
          );
          for (const userId of existingUsers) {
            if (userId !== this.myId && !this.peerConnections[userId]) {
              console.log(
                `MultiPeerWebRTCManager: Connessione all'utente esistente ${userId}...`
              );
              await this.connectToNewParticipant(userId);
            }
          }
          break;

        default:
          console.warn(
            `MultiPeerWebRTCManager: Tipo messaggio non gestito: ${message.type}`
          );
      }
    } catch (error) {
      console.error(
        `MultiPeerWebRTCManager: Errore gestione messaggio "${message.type}" da ${senderId}:`,
        error
      );
    }
  }

  /**
   * Crea una risposta SDP per un partecipante specifico.
   * @param {string} participantId - L'ID del peer a cui rispondere (quello che ha inviato l'offerta).
   */
  async createAnswer(participantId) {
    const pc = this.peerConnections[participantId];
    if (!pc) {
      console.error(
        `MultiPeerWebRTCManager: PeerConnection per ${participantId} non trovata per creare risposta.`
      );
      return;
    }
    console.log(
      `MultiPeerWebRTCManager: Creazione risposta SDP per ${participantId}...`
    );
    try {
      const answer = await pc.createAnswer();
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
  async connectToNewParticipant(participantId) {
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
    const pc = this.createPeerConnection(participantId);
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

    // Ferma lo stream locale
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      if (this.onLocalStreamReady) this.onLocalStreamReady(null);
      console.log("MultiPeerWebRTCManager: Stream locale fermato.");
    }

    // Pulisci gli stream remoti rimasti (dovrebbero essere già stati rimossi da closePeerConnection)
    this.remoteStreams = {};

    // Resetta ID (opzionale)
    // this.myId = null;

    console.log(
      "MultiPeerWebRTCManager: Tutte le connessioni chiuse e risorse rilasciate."
    );
    // Potresti voler notificare un cambio di stato generale qui
    // if (this.onPeerConnectionStateChange) this.onPeerConnectionStateChange(null, 'closed');
  }
}

export default MultiPeerWebRTCManager;