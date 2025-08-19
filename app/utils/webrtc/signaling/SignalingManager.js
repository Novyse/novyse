import { Platform } from "react-native";
import WebRTCLogger from "../logging/WebRTCLogger.js";
import { GlobalState } from "../core/GlobalState.js";
import { SDP_OPTIONS } from "../config/mediaConstraints.js";
import Compatibility from "../utils/compatibility.js";
import helpers from "../utils/helpers.js";

const { RTCSessionDescription } = Compatibility.getWebRTCLib();

/**
 * SignalingManager - Gestisce tutte le operazioni di signaling WebRTC
 * Include offer, answer, e candidate messaging
 */
export class SignalingManager {
  constructor(globalState, logger, webRTCManager) {
    this.peerConnectionManager = webRTCManager.peerConnectionManager || null;
    this.voiceActivityDetection = webRTCManager.voiceActivityDetection || null;
    this.webRTCManager = webRTCManager || null;
    this.iceManager = webRTCManager.iceManager || null;
    this.logger = logger || WebRTCLogger;
    this.globalState = globalState || new GlobalState();
    this.logger.debug("SignalingManager inizializzato", {
      component: "SignalingManager",
    });
    this.pendingOffers = new Map(); // 🔥 NUOVO: Cache per offer in arrivo anticipato
  }

  /**
   * Crea un'offerta SDP per un partecipante specifico
   * @param {string} participantId - ID del partecipante
   * @returns {Promise<RTCSessionDescription|null>}
   */
  async createOffer(participantId) {
    const myId = this.globalState.getMyId();
    if (!myId) {
      this.logger.error(
        "Cannot create offer: myId is null - GlobalState not properly initialized",
        {
          component: "SignalingManager",
          participantId,
        }
      );
      return null;
    }

    this.logger.info(`Creazione offerta per ${participantId}`, {
      component: "SignalingManager",
      participantId,
      action: "createOffer",
    });

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${participantId}`, {
        component: "SignalingManager",
        participantId,
      });
      return null;
    }

    try {
      // Verifica che non ci sia già una negoziazione in corso (atomic check and set)
      if (!this.globalState.trySetNegotiationInProgress(participantId)) {
        this.logger.warning(`Negoziazione già in corso per ${participantId}`, {
          component: "SignalingManager",
          participantId,
        });
        return null;
      }
      if (this.peerConnectionManager) {
        this.peerConnectionManager._addLocalTracksIfAvailable(
          pc,
          participantId,
          false
        );
      }

      const offer = await pc.createOffer(SDP_OPTIONS.OFFER_OPTIONS);
      await pc.setLocalDescription(offer);
      this.peerConnectionManager?.processPendingMappingsAfterOffer?.(pc);
      this.logger.info(`Offerta creata e impostata per ${participantId}`, {
        component: "SignalingManager",
        participantId,
        sdpType: offer.type,
      });

      // Invia tramite Socket con retry mechanism
      const success = await this._sendWithRetry(
        () =>
          webSocketMethods.RTCOffer({
            offer: offer.toJSON
              ? offer.toJSON()
              : { sdp: offer.sdp, type: offer.type },
            to: participantId,
            from: this.globalState.getMyId(),
            chat: this.globalState.getChatId(),
          }),
        `RTCOffer to ${participantId}`,
        3
      );

      if (!success) {
        this.logger.error(
          `Failed to send offer to ${participantId} after retries`,
          {
            component: "SignalingManager",
            participantId,
          }
        );
        throw new Error(`Failed to send offer to ${participantId}`);
      }

      return offer;
    } catch (error) {
      this.logger.error(`Errore creazione offerta per ${participantId}`, {
        component: "SignalingManager",
        participantId,
        error: error.message,
        stack: error.stack,
      });
      return null;
    } finally {
      this.globalState.setNegotiationInProgress(participantId, false);
    }
  }
  /**
   * Crea una risposta SDP per un partecipante specifico
   * @param {string} participantId - ID del partecipante
   * @returns {Promise<RTCSessionDescription|null>}
   */
  async createAnswer(participantId) {
    this.logger.info(`Creazione risposta per ${participantId}`, {
      component: "SignalingManager",
      participantId,
      action: "createAnswer",
    });

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${participantId}`, {
        component: "SignalingManager",
        participantId,
      });
      return null;
    }

    try {
      // Verifica stato del signaling
      if (pc.signalingState !== "have-remote-offer") {
        this.logger.warning(
          `Stato signaling non valido per risposta: ${pc.signalingState}`,
          {
            component: "SignalingManager",
            participantId,
            signalingState: pc.signalingState,
          }
        );
        return null;
      }

      // Registra la transizione di stato prima della creazione answer
      this.globalState.recordSignalingStateTransition(
        participantId,
        pc.signalingState,
        "creating-answer"
      );

      const answer = await pc.createAnswer(SDP_OPTIONS.ANSWER_OPTIONS);
      await pc.setLocalDescription(answer);

      // 🔥 ORA PROCESSA I MAPPING
      this.peerConnectionManager?.processPendingMappingsAfterOffer?.(pc);

      // Registra la transizione di stato prima della creazione answer
      this.globalState.recordSignalingStateTransition(
        participantId,
        pc.signalingState,
        "creating-answer"
      );

      this.logger.info(`Risposta creata e impostata per ${participantId}`, {
        component: "SignalingManager",
        participantId,
        sdpType: answer.type,
        newSignalingState: pc.signalingState,
      });

      // Invia tramite WebSocket con retry mechanism
      const success = await this._sendWithRetry(
        () =>
          webSocketMethods.RTCAnswer({
            answer: answer.toJSON
              ? answer.toJSON()
              : { sdp: answer.sdp, type: answer.type },
            to: participantId,
            from: this.globalState.getMyId(),
            chat: this.globalState.getChatId(),
          }),
        `RTCAnswer to ${participantId}`,
        3
      );

      if (!success) {
        this.logger.error(
          `Failed to send answer to ${participantId} after retries`,
          {
            component: "SignalingManager",
            participantId,
          }
        );
        throw new Error(`Failed to send answer to ${participantId}`);
      }

      return answer;
    } catch (error) {
      this.logger.error(`Errore creazione risposta per ${participantId}`, {
        component: "SignalingManager",
        participantId,
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  }
  async handleOfferMessage(message) {
    // 🔥 AGGIUNGI QUESTO DEBUG ALL'INIZIO
    console.log("📥 HANDLING OFFER MESSAGE - DETAILED DEBUG:", {
      participantId: message.from,
      offerType: message.offer?.type,
      sdpLength: message.offer?.sdp?.length,
      // 🔥 ANALISI SDP PER TRACCE VIDEO
      hasVideoInSDP: message.offer?.sdp?.includes("m=video"),
      hasAudioInSDP: message.offer?.sdp?.includes("m=audio"),
      videoMLines: (message.offer?.sdp?.match(/m=video/g) || []).length,
      audioMLines: (message.offer?.sdp?.match(/m=audio/g) || []).length,
      // 🔥 CONTEGGIO MID
      midsInSDP: (message.offer?.sdp?.match(/a=mid:/g) || []).length,
    });

    this.logger.info("Gestione messaggio offerta ricevuto", {
      component: "SignalingManager",
      from: message.from,
      action: "handleOffer",
    });

    // 🔥 DEBUG SPECIFICO PER _isMessageForMe
    const isForMe = this._isMessageForMe(message);
    console.log("🔍 _isMessageForMe CHECK:", {
      isForMe,
      messageFrom: message.from,
      messageTo: message.to,
      messageChat: message.chat,
      myId: this.globalState.getMyId(),
      myChatId: this.globalState.getChatId(),
    });

    if (!isForMe) {
      console.log("❌ MESSAGE NOT FOR ME - EARLY RETURN");
      return false;
    }

    console.log("✅ MESSAGE IS FOR ME - CONTINUING...");

    const senderId = message.from;
    let pc = this.globalState.getPeerConnection(senderId);

    // 🔥 DEBUG PEERCONNECTION
    console.log("🔗 PEERCONNECTION CHECK:", {
      senderId,
      hasPeerConnection: !!pc,
      peerConnectionState: pc?.signalingState,
    });

    // 🔥 SE NON ESISTE LA PEERCONNECTION, CREALA E RIPROVA
    if (!pc) {
      console.log("⚠️ NO PEERCONNECTION FOUND - ATTEMPTING TO CREATE...");
      this.logger.warning(
        "SignalingManager",
        `⚠️ PeerConnection non trovata per ${senderId}, creo e riprovo`,
        {
          participantId: senderId,
        }
      );

      // 🔥 FIX: Usa l'offer.from se participantId è undefined
      const actualParticipantId = senderId || message.from;

      if (!actualParticipantId) {
        this.logger.error(
          "SignalingManager",
          "❌ CANNOT CREATE PEER CONNECTION - NO PARTICIPANT ID",
          { participantId: senderId, offerFrom: message.from }
        );
        return false;
      }

      const participant = { from: actualParticipantId };
      pc = this.peerConnectionManager.createPeerConnection(participant);

      if (!pc) {
        this.logger.error(
          "SignalingManager",
          `❌ Impossibile creare PeerConnection per ${actualParticipantId}`
        );
        return false;
      }
    }

    // 🔥 RIMUOVI DALLA CACHE SE PRESENTE
    this.pendingOffers.delete(senderId);

    // 🔥 MARCA CHE STIAMO PROCESSANDO UNA OFFER
    pc._isRenegotiating = true;

    console.log("🚀 STARTING OFFER PROCESSING:", {
      senderId,
      signalingState: pc.signalingState,
      hasRemoteDescription: !!pc.remoteDescription,
      hasLocalDescription: !!pc.localDescription,
    });

    try {
      // 🔥 DEBUG STATO PRIMA DELLA RINEGOZIAZIONE
      console.log("🔄 RENEGOTIATION DEBUG - BEFORE setRemoteDescription:", {
        participantId: senderId,
        currentSignalingState: pc.signalingState,
        hasRemoteDescription: !!pc.remoteDescription,
        hasLocalDescription: !!pc.localDescription,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        existingTransceivers: pc.getTransceivers
          ? pc.getTransceivers().length
          : 0,
        existingReceivers: pc.getReceivers ? pc.getReceivers().length : 0,
        existingSenders: pc.getSenders ? pc.getSenders().length : 0,
      });

      // Verifica stato della connessione
      if (pc.signalingState === "closed") {
        console.log("❌ PEERCONNECTION IS CLOSED - ABORTING");
        this.logger.warning("Impossibile gestire offerta, connessione chiusa", {
          component: "SignalingManager",
          participantId: senderId,
          signalingState: pc.signalingState,
        });
        return false;
      }

      // 🔥 GESTIONE SPECIALE PER RINEGOZIAZIONE
      if (pc.signalingState === "stable" && pc.remoteDescription) {
        console.log(
          "🔄 RENEGOTIATION DETECTED - Current state before setRemoteDescription:",
          {
            participantId: senderId,
            signalingState: pc.signalingState,
            hasRemoteDescription: !!pc.remoteDescription,
            hasLocalDescription: !!pc.localDescription,
            remoteDescriptionType: pc.remoteDescription?.type,
            localDescriptionType: pc.localDescription?.type,
          }
        );
      }

      // 🔥 AGGIUNGI LE TRACCE LOCALI PRIMA DI setRemoteDescription
      if (this.peerConnectionManager) {
        this.peerConnectionManager._addLocalTracksIfAvailable(
          pc,
          senderId,
          true
        );
      }

      // Registra la transizione di stato prima del cambiamento
      this.globalState.recordSignalingStateTransition(
        senderId,
        pc.signalingState,
        "setting-remote-offer"
      );

      // Imposta remote description
      const remoteDesc = new RTCSessionDescription({
        type: "offer",
        sdp: message.offer.sdp,
      });

      console.log("🎯 CALLING setRemoteDescription...");
      console.log(`🔄 PRE-RENEGOTIATION MAPPING STATE:`, {
        participantId: senderId,
        allMappings:
          this.streamMappingManager?.getAllMappingsForParticipant?.(senderId) ||
          "N/A",
        transceivers: pc.getTransceivers().map((t) => ({
          mid: t.mid,
          direction: t.direction,
          hasTrack: !!t.receiver?.track,
        })),
      });
      await pc.setRemoteDescription(remoteDesc);
      console.log("✅ setRemoteDescription COMPLETED");

      // 🔥 DEBUG STATO DOPO setRemoteDescription
      console.log("🔄 RENEGOTIATION DEBUG - AFTER setRemoteDescription:", {
        participantId: senderId,
        newSignalingState: pc.signalingState,
        hasRemoteDescription: !!pc.remoteDescription,
        hasLocalDescription: !!pc.localDescription,
        newTransceivers: pc.getTransceivers ? pc.getTransceivers().length : 0,
        newReceivers: pc.getReceivers ? pc.getReceivers().length : 0,
        newSenders: pc.getSenders ? pc.getSenders().length : 0,
        // 🔥 ANALISI DETTAGLIATA TRANSCEIVERS
        transceiverDetails: pc.getTransceivers
          ? pc.getTransceivers().map((t) => ({
              mid: t.mid,
              direction: t.direction,
              currentDirection: t.currentDirection,
              hasReceiver: !!t.receiver,
              hasReceiverTrack: !!t.receiver?.track,
              receiverTrackKind: t.receiver?.track?.kind,
              receiverTrackEnabled: t.receiver?.track?.enabled,
              receiverTrackReadyState: t.receiver?.track?.readyState,
            }))
          : [],
      });

      // Registra la transizione completata
      this.globalState.recordSignalingStateTransition(
        senderId,
        "setting-remote-offer",
        pc.signalingState
      );

      this.logger.info(`Remote description (offer) impostata per ${senderId}`, {
        component: "SignalingManager",
        participantId: senderId,
        newSignalingState: pc.signalingState,
      });

      // Processa candidati ICE in coda se presenti
      await this._processQueuedICECandidates(senderId);

      // Crea e invia risposta
      await this.createAnswer(senderId);

      console.log("🎉 OFFER PROCESSING COMPLETED SUCCESSFULLY");
      return true;
    } catch (error) {
      console.log("❌ ERROR DURING OFFER PROCESSING:", error);
      this.logger.error(`Errore gestione offerta da ${senderId}:`, error, {
        component: "SignalingManager",
        participantId: senderId,
        errorMessage: error.message,
      });
      return false;
    } finally {
      // 🔥 RESET FLAG SEMPRE
      pc._isRenegotiating = false;
    }
  }
  /**
   * Gestisce un messaggio di risposta ricevuta
   * @param {Object} message - Messaggio contenente la risposta
   * @returns {Promise<boolean>}
   */
  async handleAnswerMessage(message) {
    this.logger.info("Gestione messaggio risposta ricevuto", {
      component: "SignalingManager",
      from: message.from,
      action: "handleAnswer",
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const senderId = message.from;
    const pc = this.globalState.getPeerConnection(senderId);

    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${senderId}`, {
        component: "SignalingManager",
        participantId: senderId,
      });
      return false;
    }

    // 🔥 MARCA CHE STIAMO PROCESSANDO UNA ANSWER
    pc._isRenegotiating = true;

    try {
      // Verifica timing safeguards per transizioni di stato signaling
      if (!this.globalState.canTransitionSignalingState(senderId)) {
        this.logger.warning(
          `Transizione signaling state troppo ravvicinata per ${senderId}, ignorando risposta`,
          {
            component: "SignalingManager",
            participantId: senderId,
            lastTransition:
              this.globalState.getLastSignalingStateTransition(senderId),
          }
        );
        return false;
      }

      if (!message.answer || !message.answer.sdp) {
        this.logger.error(`Risposta ricevuta senza SDP da ${senderId}`, {
          component: "SignalingManager",
          participantId: senderId,
          messageStructure: Object.keys(message),
          hasAnswer: !!message.answer,
          answerStructure: message.answer ? Object.keys(message.answer) : null,
        });
        return false;
      }

      // Verifica stato del signaling
      if (pc.signalingState !== "have-local-offer") {
        this.logger.warning(
          `Stato signaling non valido per risposta: ${pc.signalingState}`,
          {
            component: "SignalingManager",
            participantId: senderId,
            signalingState: pc.signalingState,
          }
        );
        return false;
      }

      // Registra la transizione di stato prima del cambiamento
      this.globalState.recordSignalingStateTransition(
        senderId,
        pc.signalingState,
        "setting-remote-answer"
      );

      // Imposta remote description
      const remoteDesc = new RTCSessionDescription({
        type: "answer",
        sdp: message.answer.sdp,
      });

      await pc.setRemoteDescription(remoteDesc);

      // Registra la transizione completata
      this.globalState.recordSignalingStateTransition(
        senderId,
        "setting-remote-answer",
        pc.signalingState
      );

      this.logger.info(
        `Remote description (answer) impostata per ${senderId}`,
        {
          component: "SignalingManager",
          participantId: senderId,
          newSignalingState: pc.signalingState,
        }
      );

      // Processa candidati ICE in coda se presenti
      await this._processQueuedICECandidates(senderId);

      // Add verification that remote stream is being handled
      this._verifyRemoteStreamHandling(senderId);

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione risposta da ${senderId}`, {
        component: "SignalingManager",
        participantId: senderId,
        error: error.message,
        stack: error.stack,
      });
      return false;
    } finally {
      // 🔥 RESET FLAG SEMPRE
      pc._isRenegotiating = false;
      // Assicurati che la negoziazione sia marcata come completata
      this.globalState.setNegotiationInProgress(senderId, false);
    }
  }
  /**
   * Verifies that remote stream handling is working correctly
   * @param {string} participantId - ID del partecipante
   * @private
   */
  _verifyRemoteStreamHandling(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) return;

    // Check if we have remote streams
    const remoteStreams = pc.getRemoteStreams ? pc.getRemoteStreams() : [];
    const receivers = pc.getReceivers ? pc.getReceivers() : [];

    this.logger.info(`Remote stream verification for ${participantId}`, {
      component: "SignalingManager",
      participantId,
      remoteStreamsCount: remoteStreams.length,
      receiversCount: receivers.length,
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState,
    });

    // If no remote streams, check receivers for tracks
    if (remoteStreams.length === 0 && receivers.length > 0) {
      receivers.forEach((receiver, index) => {
        if (receiver.track) {
          this.logger.info(`Found remote track via receiver ${index}`, {
            component: "SignalingManager",
            participantId,
            trackKind: receiver.track.kind,
            trackEnabled: receiver.track.enabled,
            trackReadyState: receiver.track.readyState,
          });
        }
      });
    }
  }
  /**
   * Gestisce un messaggio di candidato ICE ricevuto
   * @param {Object} message - Messaggio contenente il candidato ICE
   * @returns {Promise<boolean>}
   */ async handleCandidateMessage(message) {
    this.logger.info("Gestione messaggio candidato ICE ricevuto", {
      component: "SignalingManager",
      from: message.from,
      action: "handleCandidate",
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const senderId = message.from;

    // Delegate to ICEManager if available
    if (this.iceManager) {
      this.logger.debug(
        `Delegating ICE candidate handling to ICEManager for ${senderId}`,
        {
          component: "SignalingManager",
          participantId: senderId,
        }
      );
      return await this.iceManager.handleRemoteCandidate(
        senderId,
        message.candidate
      );
    }

    // Fallback to direct handling
    const pc = this.globalState.getPeerConnection(senderId);

    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${senderId}`, {
        component: "SignalingManager",
        participantId: senderId,
      });
      return false;
    }

    try {
      if (message.candidate) {
        this.logger.debug(`Ricevuto candidato ICE da ${senderId}`, {
          component: "SignalingManager",
          participantId: senderId,
          candidateType: message.candidate.type,
        });

        const candidate = new RTCIceCandidate(message.candidate);

        // Controlla se remote description è impostata
        if (!pc.remoteDescription) {
          this.logger.info(
            `Remote description non ancora impostata per ${senderId}, metto candidato in coda`,
            {
              component: "SignalingManager",
              participantId: senderId,
            }
          );
          this.globalState.queueICECandidate(senderId, candidate);
          return true;
        }

        // Aggiungi candidato immediatamente
        await pc.addIceCandidate(candidate);
        this.logger.debug(
          `Candidato ICE aggiunto con successo per ${senderId}`,
          {
            component: "SignalingManager",
            participantId: senderId,
          }
        );
      } else {
        // Fine candidati ICE
        this.logger.debug(`Fine candidati ICE per ${senderId}`, {
          component: "SignalingManager",
          participantId: senderId,
        });
        await pc.addIceCandidate(null);
      }

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione candidato ICE da ${senderId}`, {
        component: "SignalingManager",
        participantId: senderId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Gestisce l'ingresso di un nuovo utente
   * @param {Object} message - Messaggio di utente entrato
   * @returns {Promise<boolean>}
   */
  async handleUserJoined(message) {
    this.logger.info("Gestione utente entrato", {
      component: "SignalingManager",
      from: message.from,
      action: "handleUserJoined",
    });
    const participantId = message.from;
    const myId = this.globalState.getMyId();

    // Check if GlobalState is properly initialized
    if (!myId) {
      this.logger.error(
        "Cannot handle user joined: GlobalState not properly initialized (myId is null)",
        {
          component: "SignalingManager",
          participantId,
          globalStateMyId: this.globalState.myId,
          globalStateChatId: this.globalState.getChatId(),
        }
      );
      return false;
    }

    if (participantId === myId) {
      // Ignora il proprio join
      return true;
    }

    try {
      // Crea connessione peer per il nuovo utente
      if (this.peerConnectionManager) {
        const pc = this.peerConnectionManager.createPeerConnection({
          from: participantId,
          handle: message.handle || participantId,
        });

        if (pc) {
          this.logger.info(
            `Connessione peer creata per nuovo utente ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
            }
          );
          // Avvia negoziazione con deterministic ordering per evitare race conditions
          await this._scheduleOfferCreation(participantId);

          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Errore gestione utente entrato ${participantId}`, {
        component: "SignalingManager",
        participantId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Gestisce l'uscita di un utente
   * @param {Object} message - Messaggio di utente uscito
   * @returns {Promise<boolean>}
   */
  async handleUserLeft(message) {
    this.logger.info("Gestione utente uscito", {
      component: "SignalingManager",
      from: message.from,
      action: "handleUserLeft",
    });

    const participantId = message.from;
    const myId = this.globalState.getMyId();

    if (participantId === myId) {
      // Ignora la propria uscita
      return true;
    }

    try {
      // Chiudi connessione peer
      const pc = this.globalState.getPeerConnection(participantId);
      if (pc) {
        pc.close();
        this.logger.debug(`Connessione peer chiusa per ${participantId}`, {
          component: "SignalingManager",
          participantId,
        });
      }

      // Rimuovi da global state
      this.globalState.removePeerConnection(participantId);
      this.globalState.removeAllUserActiveStreams(participantId);

      // Pulisci pin se era pinnato
      if (this.webRTCManager) {
        this.webRTCManager.clearPinIfId(participantId);
        this.logger.debug(`Pin rimosso per utente uscito ${participantId}`);
      }

      this.logger.info(
        `Pulizia completata per utente uscito ${participantId}`,
        {
          component: "SignalingManager",
          participantId,
        }
      );

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione utente uscito ${participantId}`, {
        component: "SignalingManager",
        participantId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Imposta gli utenti già presenti nella chat
   * @param {Array} existingUsers - Array degli utenti esistenti
   * @returns {Promise<boolean>}
   */
  async setExistingUsers(existingUsers) {
    const count =
      existingUsers && typeof existingUsers === "object"
        ? Object.keys(existingUsers).length
        : 0;
    this.logger.info("Impostazione utenti esistenti", {
      component: "SignalingManager",
      usersCount: count,
      action: "setExistingUsers",
    });

    const myId = this.globalState.getMyId();

    if (!this.peerConnectionManager) {
      this.logger.error("PeerConnectionManager non disponibile", {
        component: "SignalingManager",
      });
      return false;
    }

    try {
      for (const [participantId, userData] of Object.entries(existingUsers)) {
        if (participantId === myId) {
          // Ignora se stesso
          continue;
        }

        // Crea connessione peer per utente esistente, passando l'intero oggetto 'userData' come userData
        const pc = this.peerConnectionManager.createPeerConnection({
          from: participantId,
          handle: userData.handle,
        });

        if (pc) {
          this.logger.debug(
            `Connessione peer creata per utente esistente ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
            }
          );
        }

        this.logger.info(
          `Connessioni create e screen share preesistenti processati per ${count} utenti.`,
          {
            component: "SignalingManager",
            usersCount: count,
          }
        );
      }
      return true;
    } catch (error) {
      this.logger.error("Errore impostazione utenti esistenti", {
        component: "SignalingManager",
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  /**
   * Rinegozia con tutti i peer attivi
   * @returns {Promise<void>}
   */
  async renegotiateWithAllPeers() {
    this.logger.info("Rinegoziazione con tutti i peer", {
      component: "SignalingManager",
      action: "renegotiateAll",
    });

    const peerIds = this.globalState.getAllPeerConnectionIds();

    for (const peerId of peerIds) {
      try {
        await this.createOffer(peerId);
        // Piccolo delay tra le offerte per evitare congestione
        await helpers.wait(100);
      } catch (error) {
        this.logger.error(`Errore rinegoziazione con ${peerId}`, {
          component: "SignalingManager",
          participantId: peerId,
          error: error.message,
        });
      }
    }
  }

  /**
   * Verifica se il messaggio è destinato a questo client
   * @param {Object} message - Messaggio da verificare
   * @returns {boolean}
   * @private
   */
  _isMessageForMe(message) {
    const myId = this.globalState.getMyId();
    const chatId = this.globalState.getChatId();

    // 🔥 FIX: message.to può essere myId (singlecast) o chatId (broadcast)
    const isAddressedToMe = message.to === myId; // Messaggio diretto a me
    const isBroadcastToMyChat = message.to === chatId; // Messaggio broadcast alla mia chat

    const isForMe = isAddressedToMe || isBroadcastToMyChat;

    if (!isForMe) {
      this.logger.debug("Messaggio non destinato a questo client", {
        component: "SignalingManager",
        messageFrom: message.from,
        messageTo: message.to,
        messageChat: message.chat,
        myId,
        myChatId: chatId,
        isAddressedToMe,
        isBroadcastToMyChat,
        reason: "neither_direct_nor_broadcast",
      });
    }

    return isForMe;
  }

  /**
   * Processa candidati ICE in coda
   * @param {string} participantId
   * @returns {Promise<void>}
   * @private
   */ async _processQueuedICECandidates(participantId) {
    // Delegate to ICEManager if available
    if (this.iceManager) {
      this.logger.debug(
        `Delegating queued ICE candidates processing to ICEManager for ${participantId}`,
        {
          component: "SignalingManager",
          participantId,
        }
      );
      return await this.iceManager.processQueuedCandidates(participantId);
    }

    // Fallback to direct processing
    const queuedCandidates =
      this.globalState.getQueuedICECandidates(participantId);

    if (queuedCandidates && queuedCandidates.length > 0) {
      this.logger.info(
        `Processando ${queuedCandidates.length} candidati ICE in coda per ${participantId}`,
        {
          component: "SignalingManager",
          participantId,
          candidatesCount: queuedCandidates.length,
        }
      );

      const pc = this.globalState.getPeerConnection(participantId);
      if (!pc) return;

      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(candidate);
          this.logger.debug(
            `Candidato ICE dalla coda processato per ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
            }
          );
        } catch (error) {
          this.logger.error(
            `Errore processando candidato ICE dalla coda per ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
              error: error.message,
            }
          );
        }
      }

      // Pulisci la coda    this.globalState.clearQueuedICECandidates(participantId);
    }
  }

  /**
   * Sends a WebSocket message with retry mechanism
   * @param {Function} sendFunction - Function that performs the send operation
   * @param {string} operationName - Name of the operation for logging
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<boolean>} True if message sent successfully
   * @private
   */
  async _sendWithRetry(sendFunction, operationName, maxRetries = 3) {
    const SocketMethods = await import("../../socketMethods.js");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if WebSocket is connected
        if (!SocketMethods.default.isSocketOpen()) {
          this.logger.warn(
            `WebSocket not connected for ${operationName}, attempt ${attempt}/${maxRetries}`,
            {
              component: "SignalingManager",
              operation: operationName,
              attempt,
            }
          );

          // Wait for a short time before retrying
          if (attempt < maxRetries) {
            await this._wait(Math.min(1000 * attempt, 5000)); // Exponential backoff, max 5s
            continue;
          } else {
            return false;
          }
        }

        // Try to send the message
        const result = await sendFunction();

        // If webSocketMethods returns false, treat as failure
        if (result === false) {
          throw new Error("WebSocket send returned false");
        }

        this.logger.debug(
          `${operationName} sent successfully on attempt ${attempt}`,
          {
            component: "SignalingManager",
            operation: operationName,
            attempt,
          }
        );

        return true;
      } catch (error) {
        this.logger.warn(
          `${operationName} failed on attempt ${attempt}/${maxRetries}: ${error.message}`,
          {
            component: "SignalingManager",
            operation: operationName,
            attempt,
            error: error.message,
          }
        );

        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this._wait(backoffTime);
        }
      }
    }

    this.logger.error(`${operationName} failed after ${maxRetries} attempts`, {
      component: "SignalingManager",
      operation: operationName,
      maxRetries,
    });

    return false;
  }

  /**
   * Wait utility function
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   * @private
   */
  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Pulisce tutte le negoziazioni in corso
   * @returns {void}
   */
  cleanup() {
    this.logger.info("Pulizia SignalingManager", {
      component: "SignalingManager",
      action: "cleanup",
    });

    // La pulizia delle negoziazioni è gestita dal GlobalState
    // quando vengono chiuse le connessioni peer
  }
  /**
   * Schedules offer creation with deterministic timing to prevent race conditions
   * @param {string} participantId - ID del partecipante
   * @returns {Promise<void>}
   * @private
   */
  async _scheduleOfferCreation(participantId) {
    const myId = this.globalState.getMyId();

    // Validate that we have a valid myId
    if (!myId) {
      this.logger.error(`Cannot schedule offer creation: myId is null`, {
        component: "SignalingManager",
        participantId,
        myId,
        globalStateInitialized: !!this.globalState,
      });
      return;
    }

    if (myId === participantId) {
      this.logger.warning(`Self-connection detected for ${participantId}`, {
        component: "SignalingManager",
        participantId,
        myId,
      });
      return;
    }

    // Primary strategy: Check if we have video enabled - video-enabled clients initiate
    const hasVideo =
      this.globalState.localStream &&
      this.globalState.localStream.getVideoTracks().length > 0 &&
      this.globalState.localStream
        .getVideoTracks()
        .some((track) => track.enabled);

    // Secondary strategy: Use deterministic ordering based on string comparison
    let shouldCreateOffer = hasVideo || myId > participantId;

    if (myId === participantId) {
      this.logger.warning(`Self-connection detected for ${participantId}`, {
        component: "SignalingManager",
        participantId,
        myId,
      });
      return;
    }

    // Additional debug logging to understand the decision
    this.logger.info(`Offer creation decision for ${participantId}`, {
      component: "SignalingManager",
      participantId,
      myId,
      shouldCreateOffer,
      hasVideo,
      comparison: `"${myId}" > "${participantId}" = ${myId > participantId}`,
      strategy: hasVideo ? "video-priority" : "lexicographic",
    });

    if (shouldCreateOffer) {
      // Add a small randomized delay to prevent thundering herd
      const baseDelay = hasVideo ? 10 : 50; // Faster for video-enabled clients
      const jitterDelay = Math.random() * 50; // 0-50ms jitter
      const totalDelay = baseDelay + jitterDelay;

      this.logger.info(
        `Scheduling offer creation for ${participantId} in ${totalDelay}ms`,
        {
          component: "SignalingManager",
          participantId,
          myId,
          delay: totalDelay,
          shouldCreateOffer,
        }
      );

      setTimeout(async () => {
        try {
          await this.createOffer(participantId);
        } catch (error) {
          this.logger.error(
            `Error in scheduled offer creation for ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
              error: error.message,
            }
          );
        }
      }, totalDelay);
    } else {
      this.logger.info(
        `Not creating offer for ${participantId} - waiting for remote offer`,
        {
          component: "SignalingManager",
          participantId,
          myId,
          shouldCreateOffer,
        }
      );

      // Set a timeout to create offer if we don't receive one within reasonable time
      setTimeout(async () => {
        try {
          const pc = this.globalState.getPeerConnection(participantId);
          if (pc && pc.signalingState === "stable" && !pc.remoteDescription) {
            this.logger.warning(
              `Timeout waiting for remote offer from ${participantId}, creating offer anyway`,
              {
                component: "SignalingManager",
                participantId,
                signalingState: pc.signalingState,
              }
            );
            await this.createOffer(participantId);
          }
        } catch (error) {
          this.logger.error(
            `Error in fallback offer creation for ${participantId}`,
            {
              component: "SignalingManager",
              participantId,
              error: error.message,
            }
          );
        }
      }, 500); // Reduced from 5000ms to 500ms - much faster fallback
    }
  }
}

// Default export for Expo Router compatibility
export default SignalingManager;
