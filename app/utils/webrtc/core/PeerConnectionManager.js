import { RTCPeerConnection } from '../utils/compatibility.js';
import { getWebRTCConfiguration } from '../config/configuration.js';
import { WEBRTC_CONSTANTS } from '../config/constants.js';
import { GlobalState } from './GlobalState.js';
import logger from '../logging/WebRTCLogger.js';
import { getPeerConnectionInfo, isConnectionHealthy, isConnectionFailed } from '../utils/helpers.js';

/**
 * Gestisce la creazione, configurazione e chiusura delle peer connections
 */
class PeerConnectionManager {
  constructor(globalState) {
    this.configuration = getWebRTCConfiguration();
    this.globalState = globalState || new GlobalState();
    logger.info('PeerConnectionManager', 'Inizializzato con configurazione WebRTC');
  }

  /**
   * Crea una nuova peer connection per un partecipante
   * @param {Object} participant - Dati del partecipante
   * @returns {RTCPeerConnection|null} La peer connection creata
   */
  createPeerConnection(participant) {
    const participantId = participant.from;

    if (this.globalState.getPeerConnection(participantId)) {
      logger.warning('PeerConnectionManager', `Connessione peer per ${participantId} esiste già`);
      return this.globalState.getPeerConnection(participantId);
    }

    logger.info('PeerConnectionManager', `Creazione PeerConnection per ${participantId}`);
    
    try {
      const pc = new RTCPeerConnection(this.configuration);
      const userData = { 
        handle: participant.handle, 
        from: participantId,
        is_speaking: false
      };

      // Salva nel global state
      this.globalState.addPeerConnection(participantId, pc, userData);
      this.globalState.initializeConnectionTracking(participantId);

      // Configura event handlers
      this._setupPeerConnectionEventHandlers(pc, participantId);

      // Aggiungi tracce locali se disponibili
      this._addLocalTracksIfAvailable(pc);

      logger.info('PeerConnectionManager', `PeerConnection per ${participantId} creata con successo`);
      return pc;

    } catch (error) {
      logger.error('PeerConnectionManager', `Errore creazione PeerConnection per ${participantId}:`, error);
      this.globalState.removePeerConnection(participantId);
      return null;
    }
  }

  /**
   * Configura gli event handlers per una peer connection
   * @param {RTCPeerConnection} pc 
   * @param {string} participantId 
   */  _setupPeerConnectionEventHandlers(pc, participantId) {
    // Use ICEManager for ICE-related events if available
    if (this.iceManager) {
      this.iceManager.setupICEEventHandlers(pc, participantId);
    } else {
      // Fallback to direct ICE candidate handling
      pc.onicecandidate = async (event) => {
        await this._handleIceCandidate(event, participantId);
      };

      pc.oniceconnectionstatechange = () => {
        this._handleIceConnectionStateChange(pc, participantId);
      };

      pc.onicegatheringstatechange = () => {
        this._handleIceGatheringStateChange(pc, participantId);
      };
    }

    // Track handler per stream remoti
    pc.ontrack = (event) => {
      this._handleRemoteTrack(event, participantId);
    };

    // Connection state handlers (non-ICE)
    pc.onconnectionstatechange = () => {
      this._handleConnectionStateChange(pc, participantId);
    };

    pc.onsignalingstatechange = () => {
      this._handleSignalingStateChange(pc, participantId);
    };

    logger.debug('PeerConnectionManager', `Event handlers configurati per ${participantId}`);
  }

  /**
   * Gestisce ICE candidates
   */
  async _handleIceCandidate(event, participantId) {
    if (event.candidate) {
      logger.debug('PeerConnectionManager', `ICE candidate generato per ${participantId}:`, {
        type: event.candidate.type,
        protocol: event.candidate.protocol
      });

      // Chiamata diretta a webSocketMethods.IceCandidate
      const webSocketMethods = await import('../../webSocketMethods.js');
      await webSocketMethods.default.IceCandidate({
        candidate: event.candidate.toJSON(),
        to: participantId,
        from: this.globalState.myId,
      });
    } else {
      logger.debug('PeerConnectionManager', `ICE gathering completato per ${participantId}`);
    }
  }

  /**
   * Gestisce tracce remote ricevute
   */
  _handleRemoteTrack(event, participantId) {
    logger.info('PeerConnectionManager', `Traccia remota ricevuta da ${participantId}:`, {
      kind: event.track.kind,
      label: event.track.label,
      id: event.track.id,
      streams: event.streams.map(s => s.id)
    });

    // Determina se è screen share o webcam
    const isScreenShare = this._isScreenShareTrack(event.track, event.streams);
    
    if (isScreenShare) {
      this._handleScreenShareTrack(event, participantId);
    } else {
      this._handleWebcamTrack(event, participantId);
    }
  }

  /**
   * Verifica se una traccia è di screen sharing
   */
  _isScreenShareTrack(track, streams) {
    const participantId = this._getCurrentParticipantFromTrack(track, streams);
    
    // Controlla metadata
    if (this.globalState.remoteStreamMetadata[participantId]) {
      for (const [metaStreamId, streamType] of Object.entries(this.globalState.remoteStreamMetadata[participantId])) {
        if (streamType === "screenshare") {
          const eventStreamId = streams.length > 0 ? streams[0].id : track.id;
          if (eventStreamId.includes(metaStreamId) || metaStreamId.includes("screen")) {
            return true;
          }
        }
      }
    }

    // Fallback: controlla label o ID
    return (
      track.label.includes("screen") ||
      track.label.includes("Screen") ||
      track.id.includes("screen") ||
      (streams.length > 0 && streams[0].id.includes("screen"))
    );
  }

  /**
   * Gestisce tracce di screen sharing
   */
  _handleScreenShareTrack(event, participantId) {
    const streamId = event.streams.length > 0 ? event.streams[0].id : `screen_${Date.now()}`;
    
    if (!this.globalState.remoteScreenStreams[participantId]) {
      this.globalState.remoteScreenStreams[participantId] = {};
    }

    if (!this.globalState.remoteScreenStreams[participantId][streamId]) {
      this.globalState.remoteScreenStreams[participantId][streamId] = new MediaStream();
    }

    this.globalState.remoteScreenStreams[participantId][streamId].addTrack(event.track);
    logger.info('PeerConnectionManager', `Screen share track aggiunta: ${participantId}/${streamId}`);

    // Emetti evento per UI
    this._emitStreamEvent(participantId, this.globalState.remoteScreenStreams[participantId][streamId], 'screenshare', streamId);
  }

  /**
   * Gestisce tracce webcam
   */
  _handleWebcamTrack(event, participantId) {
    if (!this.globalState.remoteStreams[participantId]) {
      this.globalState.addRemoteStream(participantId, new MediaStream());
    }

    const stream = this.globalState.remoteStreams[participantId];
    stream.addTrack(event.track);

    // Gestisci audio tramite AudioContext se disponibile
    if (this.globalState.audioContextRef && stream.getAudioTracks().length > 0) {
      this.globalState.audioContextRef.addAudio(participantId, stream);
    }

    logger.info('PeerConnectionManager', `Webcam track aggiunta per ${participantId}`);

    // Emetti evento per UI
    this._emitStreamEvent(participantId, stream, 'webcam');

    // Setup track event handlers
    this._setupTrackEventHandlers(event.track);
  }

  /**
   * Emette eventi per aggiornamenti stream
   */
  _emitStreamEvent(participantId, stream, streamType, streamId = null) {
    // Importa eventEmitter qui per evitare circular imports
    import('../../EventEmitter.js').then(({ default: eventEmitter }) => {
      eventEmitter.emit("stream_added_or_updated", {
        participantId,
        stream,
        streamType,
        streamId,
        userData: this.globalState.userData[participantId],
      });
    });

    // Notifica UI update
    if (this.globalState.onStreamUpdate) {
      this.globalState.onStreamUpdate();
    }
  }

  /**
   * Configura event handlers per le tracce
   */
  _setupTrackEventHandlers(track) {
    track.onended = () => {
      logger.debug('PeerConnectionManager', 'Traccia remota terminata:', track.id);
      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
    };

    track.onmute = () => {
      logger.debug('PeerConnectionManager', 'Traccia remota mutata:', track.id);
      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
    };

    track.onunmute = () => {
      logger.debug('PeerConnectionManager', 'Traccia remota smutata:', track.id);
      if (this.globalState.onStreamUpdate) {
        this.globalState.onStreamUpdate();
      }
    };
  }

  /**
   * Gestisce cambi di stato della connessione ICE
   */
  _handleIceConnectionStateChange(pc, participantId) {
    const state = pc.iceConnectionState;
    logger.info('PeerConnectionManager', `ICE connection state per ${participantId}: ${state}`);

    // Aggiorna stato globale
    this.globalState.connectionStates[participantId] = state;

    // Notifica callback UI
    if (this.globalState.onPeerConnectionStateChange) {
      this.globalState.onPeerConnectionStateChange(participantId, state);
    }

    // Gestisci stati specifici
    switch (state) {
      case "connected":
      case "completed":
        logger.info('PeerConnectionManager', `✅ Connessione a ${participantId} stabilita`);
        this.globalState.lastKnownGoodStates[participantId] = Date.now();
        this.globalState.reconnectionAttempts[participantId] = 0;
        break;

      case "failed":
        logger.warning('PeerConnectionManager', `❌ Connessione a ${participantId} fallita`);
        this._triggerConnectionRecovery(participantId);
        break;

      case "disconnected":
        logger.warning('PeerConnectionManager', `⚠️ Connessione a ${participantId} disconnessa`);
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            this._triggerConnectionRecovery(participantId);
          }
        }, 5000);
        break;
    }
  }

  /**
   * Gestisce cambi di stato della connessione generale
   */
  _handleConnectionStateChange(pc, participantId) {
    const state = pc.connectionState;
    logger.debug('PeerConnectionManager', `Connection state per ${participantId}: ${state}`);

    if (state === "failed") {
      this._triggerConnectionRecovery(participantId);
    }
  }

  /**
   * Gestisce cambi di stato del signaling
   */
  _handleSignalingStateChange(pc, participantId) {
    const state = pc.signalingState;
    logger.debug('PeerConnectionManager', `Signaling state per ${participantId}: ${state}`);
  }

  /**
   * Gestisce cambi di stato dell'ICE gathering
   */
  _handleIceGatheringStateChange(pc, participantId) {
    const state = pc.iceGatheringState;
    logger.debug('PeerConnectionManager', `ICE gathering state per ${participantId}: ${state}`);
  }

  /**
   * Aggiunge tracce locali a una peer connection
   * @param {RTCPeerConnection} pc 
   */
  _addLocalTracksIfAvailable(pc) {
    if (!this.globalState.localStream) {
      logger.debug('PeerConnectionManager', 'Nessun local stream disponibile per aggiungere tracce');
      return;
    }

    this.globalState.localStream.getTracks().forEach((track) => {
      // Evita duplicati
      const already = pc.getSenders().find((s) => s.track && s.track.id === track.id);
      if (!already) {
        pc.addTrack(track, this.globalState.localStream);
        logger.debug('PeerConnectionManager', `Traccia locale aggiunta: ${track.kind}`);
      }
    });
  }

  /**
   * Trigger per recovery della connessione
   */  _triggerConnectionRecovery(participantId) {
    // Importa RecoveryManager qui per evitare circular imports
    import('../features/RecoveryManager.js').then(({ RecoveryManager }) => {
      const recoveryManager = new RecoveryManager(this.globalState, this.logger);
      recoveryManager.attemptConnectionRecovery(participantId);
    });
  }

  /**
   * Ottieni info sulla connessione di un partecipante
   */
  getConnectionInfo(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    return getPeerConnectionInfo(pc, participantId);
  }

  /**
   * Chiude una peer connection specifica
   * @param {string} participantId 
   */
  closePeerConnection(participantId) {
    const pc = this.globalState.getPeerConnection(participantId);
    if (pc) {
      logger.info('PeerConnectionManager', `Chiusura connessione con ${participantId}`);
      
      try {
        pc.close();
      } catch (error) {
        logger.error('PeerConnectionManager', `Errore chiusura peer connection per ${participantId}:`, error);
      }
      
      // Pulisci stream remoti
      const remoteStream = this.globalState.remoteStreams[participantId];
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        this.globalState.removeRemoteStream(participantId);
      }

      // Pulisci dal global state
      this.globalState.removePeerConnection(participantId);
      this.globalState.clearConnectionTracking(participantId);

      // Notifica UI
      if (this.globalState.onParticipantLeft) {
        this.globalState.onParticipantLeft(participantId);
      }

      logger.info('PeerConnectionManager', `Connessione con ${participantId} chiusa`);
    }
  }

  /**
   * Chiude tutte le peer connections
   */
  closeAllPeerConnections() {
    logger.info('PeerConnectionManager', 'Chiusura di tutte le connessioni peer');    
    const participantIds = Object.keys(this.globalState.getAllPeerConnections());
    participantIds.forEach(participantId => {
      this.closePeerConnection(participantId);
    });

    logger.info('PeerConnectionManager', 'Tutte le connessioni peer chiuse');
  }

  /**
   * Ottieni un report di tutte le connessioni
   */
  getConnectionsReport() {
    const connections = this.globalState.getAllPeerConnections();
    const report = {
      totalConnections: Object.keys(connections).length,
      connections: {}
    };

    Object.keys(connections).forEach(participantId => {
      report.connections[participantId] = this.getConnectionInfo(participantId);
    });

    return report;
  }

  /**
   * Helper per ottenere participantId da track/streams
   */
  _getCurrentParticipantFromTrack(track, streams) {
    // Questa è una implementazione semplificata
    // In una implementazione reale potresti aver bisogno di più logica
    // per determinare il participantId dalla traccia
    
    // Per ora, cerca negli userData per corrispondenze di stream
    for (const [participantId, userData] of Object.entries(this.globalState.userData)) {
      if (streams.length > 0) {
        // Potresti aver bisogno di logica più sofisticata qui
        return participantId;
      }
    }
    
    return 'unknown';
  }
}

// Istanza singleton
const peerConnectionManager = new PeerConnectionManager();  

export default peerConnectionManager;
