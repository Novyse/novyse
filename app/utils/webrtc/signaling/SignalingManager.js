import { Platform } from 'react-native';
import WebRTCLogger from '../logging/WebRTCLogger.js';
import { GlobalState } from '../core/GlobalState.js';
import { SDP_OPTIONS } from '../config/mediaConstraints.js';
import Compatibility from '../utils/compatibility.js';
import { Helpers } from '../utils/helpers.js';
import webSocketMethods from '../../webSocketMethods.js';
import { relativeTimeThreshold } from 'moment';

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
    this.logger.debug('SignalingManager inizializzato', { component: 'SignalingManager' });
  }

  /**
   * Crea un'offerta SDP per un partecipante specifico
   * @param {string} participantId - ID del partecipante
   * @returns {Promise<RTCSessionDescription|null>}
   */
  async createOffer(participantId) {
    this.logger.info(`Creazione offerta per ${participantId}`, { 
      component: 'SignalingManager',
      participantId,
      action: 'createOffer'
    });

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${participantId}`, {
        component: 'SignalingManager',
        participantId
      });
      return null;
    }

    try {
      // Verifica che non ci sia già una negoziazione in corso
      if (this.globalState.isNegotiationInProgress(participantId)) {
        this.logger.warning(`Negoziazione già in corso per ${participantId}`, {
          component: 'SignalingManager',
          participantId
        });
        return null;
      }

      this.globalState.setNegotiationInProgress(participantId, true);

      const offer = await pc.createOffer(SDP_OPTIONS.OFFER_OPTIONS);
      await pc.setLocalDescription(offer);

      this.logger.info(`Offerta creata e impostata per ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        sdpType: offer.type
      });      // Invia tramite Socket usando direttamente webSocketMethods.RTCOffer
      await webSocketMethods.RTCOffer({
        offer: offer.toJSON ? offer.toJSON() : { sdp: offer.sdp, type: offer.type },
        to: participantId,
        from: this.globalState.getMyId(),
        chat: this.globalState.getChatId()
      });

      return offer;
    } catch (error) {
      this.logger.error(`Errore creazione offerta per ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        error: error.message,
        stack: error.stack
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
      component: 'SignalingManager',
      participantId,
      action: 'createAnswer'
    });

    const pc = this.globalState.getPeerConnection(participantId);
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${participantId}`, {
        component: 'SignalingManager',
        participantId
      });
      return null;
    }

    try {
      // Verifica stato del signaling
      if (pc.signalingState !== 'have-remote-offer') {
        this.logger.warning(`Stato signaling non valido per risposta: ${pc.signalingState}`, {
          component: 'SignalingManager',
          participantId,
          signalingState: pc.signalingState
        });
        return null;
      }

      const answer = await pc.createAnswer(SDP_OPTIONS.ANSWER_OPTIONS);
      await pc.setLocalDescription(answer);

      this.logger.info(`Risposta creata e impostata per ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        sdpType: answer.type
      });      // Invia tramite WebSocket usando direttamente webSocketMethods.RTCAnswer
      await webSocketMethods.RTCAnswer({
        answer: answer.toJSON ? answer.toJSON() : { sdp: answer.sdp, type: answer.type },
        to: participantId,
        from: this.globalState.getMyId(),
        chat: this.globalState.getChatId()
      });

      return answer;
    } catch (error) {
      this.logger.error(`Errore creazione risposta per ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Gestisce un messaggio di offerta ricevuto
   * @param {Object} message - Messaggio contenente l'offerta
   * @returns {Promise<boolean>}
   */
  async handleOfferMessage(message) {
    this.logger.info('Gestione messaggio offerta ricevuto', {
      component: 'SignalingManager',
      from: message.from,
      action: 'handleOffer'
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const senderId = message.from;
    const pc = this.globalState.getPeerConnection(senderId);
    
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });
      return false;
    }    if (!message.offer || !message.offer.sdp) {
      this.logger.error(`Offerta ricevuta senza SDP da ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId,
        messageStructure: Object.keys(message),
        hasOffer: !!message.offer,
        offerStructure: message.offer ? Object.keys(message.offer) : null
      });
      return false;
    }

    try {
      // Verifica stato della connessione
      if (pc.signalingState === 'closed') {
        this.logger.warning('Impossibile gestire offerta, connessione chiusa', {
          component: 'SignalingManager',
          participantId: senderId,
          signalingState: pc.signalingState
        });
        return false;
      }

      // Imposta remote description
      const remoteDesc = new RTCSessionDescription({ 
        type: 'offer', 
        sdp: message.offer.sdp 
      });
      
      await pc.setRemoteDescription(remoteDesc);

      this.logger.info(`Remote description (offer) impostata per ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });

      // Processa candidati ICE in coda se presenti
      await this._processQueuedICECandidates(senderId);

      // Crea e invia risposta
      await this.createAnswer(senderId);

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione offerta da ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Gestisce un messaggio di risposta ricevuta
   * @param {Object} message - Messaggio contenente la risposta
   * @returns {Promise<boolean>}
   */
  async handleAnswerMessage(message) {
    this.logger.info('Gestione messaggio risposta ricevuto', {
      component: 'SignalingManager',
      from: message.from,
      action: 'handleAnswer'
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const senderId = message.from;
    const pc = this.globalState.getPeerConnection(senderId);
    
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });
      return false;
    }    if (!message.answer || !message.answer.sdp) {
      this.logger.error(`Risposta ricevuta senza SDP da ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId,
        messageStructure: Object.keys(message),
        hasAnswer: !!message.answer,
        answerStructure: message.answer ? Object.keys(message.answer) : null
      });
      return false;
    }

    try {
      // Verifica stato del signaling
      if (pc.signalingState !== 'have-local-offer') {
        this.logger.warning(`Stato signaling non valido per risposta: ${pc.signalingState}`, {
          component: 'SignalingManager',
          participantId: senderId,
          signalingState: pc.signalingState
        });
        return false;
      }

      // Imposta remote description
      const remoteDesc = new RTCSessionDescription({ 
        type: 'answer', 
        sdp: message.answer.sdp 
      });
      
      await pc.setRemoteDescription(remoteDesc);

      this.logger.info(`Remote description (answer) impostata per ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });

      // Processa candidati ICE in coda se presenti
      await this._processQueuedICECandidates(senderId);

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione risposta da ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Gestisce un messaggio di candidato ICE ricevuto
   * @param {Object} message - Messaggio contenente il candidato ICE
   * @returns {Promise<boolean>}
   */  async handleCandidateMessage(message) {
    this.logger.info('Gestione messaggio candidato ICE ricevuto', {
      component: 'SignalingManager',
      from: message.from,
      action: 'handleCandidate'
    });

    if (!this._isMessageForMe(message)) {
      return false;
    }

    const senderId = message.from;
    
    // Delegate to ICEManager if available
    if (this.iceManager) {
      this.logger.debug(`Delegating ICE candidate handling to ICEManager for ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });
      return await this.iceManager.handleRemoteCandidate(senderId, message.candidate);
    }

    // Fallback to direct handling
    const pc = this.globalState.getPeerConnection(senderId);
    
    if (!pc) {
      this.logger.error(`PeerConnection non trovata per ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId
      });
      return false;
    }

    try {
      if (message.candidate) {
        this.logger.debug(`Ricevuto candidato ICE da ${senderId}`, {
          component: 'SignalingManager',
          participantId: senderId,
          candidateType: message.candidate.type
        });

        const candidate = new RTCIceCandidate(message.candidate);

        // Controlla se remote description è impostata
        if (!pc.remoteDescription) {
          this.logger.info(`Remote description non ancora impostata per ${senderId}, metto candidato in coda`, {
            component: 'SignalingManager',
            participantId: senderId
          });
          this.globalState.queueICECandidate(senderId, candidate);
          return true;
        }

        // Aggiungi candidato immediatamente
        await pc.addIceCandidate(candidate);
        this.logger.debug(`Candidato ICE aggiunto con successo per ${senderId}`, {
          component: 'SignalingManager',
          participantId: senderId
        });

      } else {
        // Fine candidati ICE
        this.logger.debug(`Fine candidati ICE per ${senderId}`, {
          component: 'SignalingManager',
          participantId: senderId
        });
        await pc.addIceCandidate(null);
      }

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione candidato ICE da ${senderId}`, {
        component: 'SignalingManager',
        participantId: senderId,
        error: error.message
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
    this.logger.info('Gestione utente entrato', {
      component: 'SignalingManager',
      from: message.from,
      action: 'handleUserJoined'
    });    
    const participantId = message.from;
    const myId = this.globalState.myId;
    
    if (participantId === myId) {
      // Ignora il proprio join
      return true;
    }

    try {
      // Crea connessione peer per il nuovo utente
      if(this.peerConnectionManager) {
        const pc = this.peerConnectionManager.createPeerConnection({
          from: participantId,
          handle: message.handle || participantId
        });
        
        if (pc) {
          this.logger.info(`Connessione peer creata per nuovo utente ${participantId}`, {
            component: 'SignalingManager',
            participantId
          });
          
          // Avvia negoziazione se siamo noi a dover iniziare
          setTimeout(async () => {
            await this.createOffer(participantId);
          }, 100);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Errore gestione utente entrato ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        error: error.message
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
    this.logger.info('Gestione utente uscito', {
      component: 'SignalingManager',
      from: message.from,
      action: 'handleUserLeft'
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
          component: 'SignalingManager',
          participantId
        });
      }

      // Rimuovi da global state
      this.globalState.removePeerConnection(participantId);
      this.globalState.removeRemoteStream(participantId);

      // Pulisci pin se era pinnato
      if (this.webRTCManager) {
        this.webRTCManager.clearPinIfId(participantId);
        this.logger.debug(`Pin rimosso per utente uscito ${participantId}`);
      }

      this.logger.info(`Pulizia completata per utente uscito ${participantId}`, {
        component: 'SignalingManager',
        participantId
      });

      return true;
    } catch (error) {
      this.logger.error(`Errore gestione utente uscito ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        error: error.message
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
    this.logger.info('Impostazione utenti esistenti', {
      component: 'SignalingManager',
      usersCount: existingUsers.length,
      action: 'setExistingUsers'
    });

    if (!Array.isArray(existingUsers)) {
      this.logger.error('Lista utenti esistenti non valida', {
        component: 'SignalingManager',
        existingUsers
      });
      return false;
    }

    const myId = this.globalState.getMyId();
    
    if (!this.peerConnectionManager) {
      this.logger.error('PeerConnectionManager non disponibile', {
        component: 'SignalingManager'
      });
      return false;
    }

    try {
      for (const user of existingUsers) {
        const participantId = user.id || user.from;
        
        if (participantId === myId) {
          // Ignora se stesso
          continue;
        }

        // Crea connessione peer per utente esistente
        const pc = this.peerConnectionManager.createPeerConnection({
          from: participantId,
          handle: user.handle || participantId
        });
        
        if (pc) {
          this.logger.debug(`Connessione peer creata per utente esistente ${participantId}`, {
            component: 'SignalingManager',
            participantId
          });
        }
      }

      this.logger.info(`Connessioni create per ${existingUsers.length} utenti esistenti`, {
        component: 'SignalingManager',
        usersCount: existingUsers.length
      });

      return true;
    } catch (error) {
      this.logger.error('Errore impostazione utenti esistenti', {
        component: 'SignalingManager',
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Rinegozia con tutti i peer attivi
   * @returns {Promise<void>}
   */
  async renegotiateWithAllPeers() {
    this.logger.info('Rinegoziazione con tutti i peer', {
      component: 'SignalingManager',
      action: 'renegotiateAll'
    });

    const peerIds = this.globalState.getAllPeerConnectionIds();
    
    for (const peerId of peerIds) {
      try {
        await this.createOffer(peerId);
        // Piccolo delay tra le offerte per evitare congestione
        await Helpers.delay(100);
      } catch (error) {
        this.logger.error(`Errore rinegoziazione con ${peerId}`, {
          component: 'SignalingManager',
          participantId: peerId,
          error: error.message
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
    
    const isForMe = message.to === myId && message.chat === chatId;
    
    if (!isForMe) {
      this.logger.debug('Messaggio non destinato a questo client', {
        component: 'SignalingManager',
        messageFrom: message.from,
        messageTo: message.to,
        messageChat: message.chat,
        myId,
        myChatId: chatId
      });
    }
    
    return isForMe;
  }

  /**
   * Processa candidati ICE in coda
   * @param {string} participantId
   * @returns {Promise<void>}
   * @private
   */  async _processQueuedICECandidates(participantId) {
    // Delegate to ICEManager if available
    if (this.iceManager) {
      this.logger.debug(`Delegating queued ICE candidates processing to ICEManager for ${participantId}`, {
        component: 'SignalingManager',
        participantId
      });
      return await this.iceManager.processQueuedCandidates(participantId);
    }

    // Fallback to direct processing
    const queuedCandidates = this.globalState.getQueuedICECandidates(participantId);
    
    if (queuedCandidates && queuedCandidates.length > 0) {
      this.logger.info(`Processando ${queuedCandidates.length} candidati ICE in coda per ${participantId}`, {
        component: 'SignalingManager',
        participantId,
        candidatesCount: queuedCandidates.length
      });

      const pc = this.globalState.getPeerConnection(participantId);
      if (!pc) return;

      for (const candidate of queuedCandidates) {
        try {
          await pc.addIceCandidate(candidate);
          this.logger.debug(`Candidato ICE dalla coda processato per ${participantId}`, {
            component: 'SignalingManager',
            participantId
          });
        } catch (error) {
          this.logger.error(`Errore processando candidato ICE dalla coda per ${participantId}`, {
            component: 'SignalingManager',
            participantId,
            error: error.message
          });
        }
      }

      // Pulisci la coda
      this.globalState.clearQueuedICECandidates(participantId);
    }
  }

  /**
   * Pulisce tutte le negoziazioni in corso
   * @returns {void}
   */
  cleanup() {
    this.logger.info('Pulizia SignalingManager', {
      component: 'SignalingManager',
      action: 'cleanup'
    });

    // La pulizia delle negoziazioni è gestita dal GlobalState
    // quando vengono chiuse le connessioni peer
  }
}

// Default export for Expo Router compatibility
export default SignalingManager;
