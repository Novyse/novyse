import { Platform } from 'react-native';
import WebRTCLogger from '../logging/WebRTCLogger.js';
import { GlobalState } from '../core/GlobalState.js';
import Compatibility from '../utils/compatibility.js';
import { createMediaStream } from '../utils/compatibility.js';
import { Helpers } from '../utils/helpers.js';

const { mediaDevices } = Compatibility.getWebRTCLib();

/**
 * StreamManager - Gestisce tutti i MediaStream (locali, remoti, screen share)
 * Include acquisizione, gestione tracce, e cleanup degli stream
 */
export class StreamManager {
  constructor() {
    this.logger = WebRTCLogger;
    this.globalState = GlobalState;
    
    // Configurazioni stream
    this.DEFAULT_AUDIO_CONSTRAINTS = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    };
    
    this.DEFAULT_VIDEO_CONSTRAINTS = {
      facingMode: 'user',
      width: { ideal: 1920, min: 640 },
      height: { ideal: 1080, min: 480 }
    };

    this.logger.debug('StreamManager inizializzato', { 
      component: 'StreamManager',
      platform: Platform.OS
    });
  }

  /**
   * Avvia l'acquisizione dello stream locale
   * @param {boolean} audioOnly - Se true, acquisisce solo audio
   * @param {Object} customConstraints - Vincoli personalizzati opzionali
   * @returns {Promise<MediaStream|null>}
   */
  async startLocalStream(audioOnly = true, customConstraints = null) {
    this.logger.info('Avvio acquisizione stream locale', {
      component: 'StreamManager',
      audioOnly,
      action: 'startLocalStream'
    });

    // Verifica se stream locale già presente
    const existingStream = this.globalState.getLocalStream();
    if (existingStream) {
      this.logger.warning('Stream locale già attivo', {
        component: 'StreamManager',
        streamId: existingStream.id,
        tracks: existingStream.getTracks().length
      });
      return existingStream;
    }

    try {
      const constraints = customConstraints || this._buildStreamConstraints(audioOnly);
      
      this.logger.debug('Richiesta getUserMedia con constraints', {
        component: 'StreamManager',
        constraints
      });

      const stream = await mediaDevices.getUserMedia(constraints);
      
      this.logger.info('Stream locale acquisito con successo', {
        component: 'StreamManager',
        streamId: stream.id,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });

      // Salva stream nel state globale
      this.globalState.setLocalStream(stream);

      // Aggiungi stream a tutte le connessioni peer esistenti
      await this._addStreamToAllPeers(stream);

      // Notifica callback se disponibile
      const callback = this.globalState.getCallback('onLocalStreamReady');
      if (callback) {
        callback(stream);
      }

      return stream;
    } catch (error) {
      this.logger.error('Errore acquisizione stream locale', {
        component: 'StreamManager',
        error: error.message,
        errorName: error.name,
        stack: error.stack
      });
      
      // Gestisci errori specifici
      if (error.name === 'NotAllowedError') {
        this.logger.error('Permessi media negati dall\'utente', {
          component: 'StreamManager',
          errorType: 'permission_denied'
        });
      } else if (error.name === 'NotFoundError') {
        this.logger.error('Dispositivi media non trovati', {
          component: 'StreamManager',
          errorType: 'device_not_found'
        });
      }

      return null;
    }
  }

  /**
   * Ferma lo stream locale
   * @returns {void}
   */
  stopLocalStream() {
    this.logger.info('Arresto stream locale', {
      component: 'StreamManager',
      action: 'stopLocalStream'
    });

    const localStream = this.globalState.getLocalStream();
    if (localStream) {
      // Ferma tutte le tracce
      localStream.getTracks().forEach(track => {
        track.stop();
        this.logger.debug('Traccia locale fermata', {
          component: 'StreamManager',
          trackId: track.id,
          trackKind: track.kind
        });
      });

      // Rimuovi dal state globale
      this.globalState.setLocalStream(null);

      // Notifica callback se disponibile
      const callback = this.globalState.getCallback('onLocalStreamReady');
      if (callback) {
        callback(null);
      }

      this.logger.info('Stream locale fermato con successo', {
        component: 'StreamManager'
      });
    }
  }

  /**
   * Aggiunge una traccia video allo stream locale esistente
   * @param {Object} videoConstraints - Vincoli video personalizzati
   * @returns {Promise<boolean>}
   */
  async addVideoTrack(videoConstraints = null) {
    this.logger.info('Aggiunta traccia video allo stream locale', {
      component: 'StreamManager',
      action: 'addVideoTrack'
    });

    const localStream = this.globalState.getLocalStream();
    if (!localStream) {
      this.logger.error('Nessuno stream locale disponibile per aggiungere video', {
        component: 'StreamManager'
      });
      return false;
    }

    // Verifica se già presente traccia video
    if (localStream.getVideoTracks().length > 0) {
      this.logger.warning('Traccia video già presente nello stream locale', {
        component: 'StreamManager',
        existingVideoTracks: localStream.getVideoTracks().length
      });
      return true;
    }

    try {
      const constraints = {
        video: videoConstraints || this.DEFAULT_VIDEO_CONSTRAINTS,
        audio: false // Solo video
      };

      const videoStream = await mediaDevices.getUserMedia(constraints);
      const videoTrack = videoStream.getVideoTracks()[0];

      if (videoTrack) {
        // Aggiungi traccia allo stream locale
        localStream.addTrack(videoTrack);

        // Aggiungi traccia a tutte le connessioni peer
        await this._addTrackToAllPeers(videoTrack, localStream);

        this.logger.info('Traccia video aggiunta con successo', {
          component: 'StreamManager',
          trackId: videoTrack.id
        });

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Errore aggiunta traccia video', {
        component: 'StreamManager',
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Rimuove tutte le tracce video dallo stream locale
   * @returns {Promise<boolean>}
   */
  async removeVideoTracks() {
    this.logger.info('Rimozione tracce video dallo stream locale', {
      component: 'StreamManager',
      action: 'removeVideoTracks'
    });

    const localStream = this.globalState.getLocalStream();
    if (!localStream) {
      this.logger.warning('Nessuno stream locale disponibile', {
        component: 'StreamManager'
      });
      return false;
    }

    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      this.logger.warning('Nessuna traccia video da rimuovere', {
        component: 'StreamManager'
      });
      return true;
    }

    try {
      // Rimuovi tracce video da tutte le connessioni peer
      await this._removeVideoTracksFromAllPeers();

      // Ferma e rimuovi tracce dallo stream locale
      videoTracks.forEach(track => {
        track.stop();
        localStream.removeTrack(track);
        
        this.logger.debug('Traccia video rimossa', {
          component: 'StreamManager',
          trackId: track.id
        });
      });

      this.logger.info(`${videoTracks.length} tracce video rimosse con successo`, {
        component: 'StreamManager',
        removedTracks: videoTracks.length
      });

      return true;
    } catch (error) {
      this.logger.error('Errore rimozione tracce video', {
        component: 'StreamManager',
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Gestisce l'arrivo di una traccia remota
   * @param {RTCTrackEvent} event - Evento traccia
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   */
  handleRemoteTrack(event, participantId) {
    this.logger.info(`Traccia remota ricevuta da ${participantId}`, {
      component: 'StreamManager',
      participantId,
      trackKind: event.track.kind,
      trackId: event.track.id,
      trackLabel: event.track.label,
      streamsCount: event.streams.length
    });

    if (event.streams.length === 0) {
      this.logger.warning('Nessuno stream associato alla traccia remota', {
        component: 'StreamManager',
        participantId,
        trackId: event.track.id
      });
      return;
    }

    const stream = event.streams[0];
    const isScreenShare = this._detectScreenShare(event, participantId);

    if (isScreenShare) {
      this._handleRemoteScreenShare(stream, participantId, event);
    } else {
      this._handleRemoteWebcamStream(stream, participantId, event);
    }
  }

  /**
   * Ottiene tutti gli stream remoti per un partecipante
   * @param {string} participantId - ID del partecipante
   * @returns {Object}
   */
  getRemoteStreams(participantId) {
    return {
      webcam: this.globalState.getRemoteStream(participantId),
      screenShares: this.globalState.getRemoteScreenStreams(participantId)
    };
  }

  /**
   * Ottiene tutti gli stream remoti di tutti i partecipanti
   * @returns {Object}
   */
  getAllRemoteStreams() {
    const participantIds = this.globalState.getAllPeerConnectionIds();
    const allStreams = {};

    participantIds.forEach(participantId => {
      allStreams[participantId] = this.getRemoteStreams(participantId);
    });

    return allStreams;
  }

  /**
   * Pulisce tutti gli stream per un partecipante
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   */
  cleanupStreamsForParticipant(participantId) {
    this.logger.info(`Pulizia stream per partecipante ${participantId}`, {
      component: 'StreamManager',
      participantId,
      action: 'cleanupStreamsForParticipant'
    });

    // Pulisci stream webcam remoto
    const webcamStream = this.globalState.getRemoteStream(participantId);
    if (webcamStream) {
      this._cleanupStream(webcamStream);
      this.globalState.removeRemoteStream(participantId);
    }

    // Pulisci stream screen share remoti
    const screenStreams = this.globalState.getRemoteScreenStreams(participantId);
    if (screenStreams) {
      Object.values(screenStreams).forEach(stream => {
        this._cleanupStream(stream);
      });
      this.globalState.removeAllRemoteScreenStreams(participantId);
    }
    // Pulisci metadata stream
    this.globalState.removeAllStreamMetadata(participantId);
  }

  /**
   * Pulisce tutte le risorse stream
   * @returns {void}
   */
  cleanup() {
    this.logger.info('Pulizia completa StreamManager', {
      component: 'StreamManager',
      action: 'cleanup'
    });

    // Ferma stream locale
    this.stopLocalStream();

    // Pulisci tutti gli stream remoti
    const participantIds = this.globalState.getAllPeerConnectionIds();
    participantIds.forEach(participantId => {
      this.cleanupStreamsForParticipant(participantId);
    });
  }

  /**
   * Costruisce i constraints per getUserMedia
   * @param {boolean} audioOnly - Se acquisire solo audio
   * @returns {Object}
   * @private
   */
  _buildStreamConstraints(audioOnly) {
    const constraints = {
      audio: this.DEFAULT_AUDIO_CONSTRAINTS
    };

    if (!audioOnly) {
      constraints.video = this.DEFAULT_VIDEO_CONSTRAINTS;
    } else {
      constraints.video = false;
    }

    return constraints;
  }

  /**
   * Aggiunge stream a tutte le connessioni peer esistenti
   * @param {MediaStream} stream - Stream da aggiungere
   * @returns {Promise<void>}
   * @private
   */
  async _addStreamToAllPeers(stream) {
    const peerConnections = this.globalState.getAllPeerConnections();
    
    for (const [participantId, pc] of Object.entries(peerConnections)) {
      try {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        
        this.logger.debug(`Stream aggiunto alla connessione con ${participantId}`, {
          component: 'StreamManager',
          participantId,
          streamId: stream.id
        });
      } catch (error) {
        this.logger.error(`Errore aggiungendo stream alla connessione con ${participantId}`, {
          component: 'StreamManager',
          participantId,
          error: error.message
        });
      }
    }
  }

  /**
   * Aggiunge una traccia a tutte le connessioni peer esistenti
   * @param {MediaStreamTrack} track - Traccia da aggiungere
   * @param {MediaStream} stream - Stream di appartenenza
   * @returns {Promise<void>}
   * @private
   */
  async _addTrackToAllPeers(track, stream) {
    const peerConnections = this.globalState.getAllPeerConnections();
    
    for (const [participantId, pc] of Object.entries(peerConnections)) {
      try {
        pc.addTrack(track, stream);
        
        this.logger.debug(`Traccia aggiunta alla connessione con ${participantId}`, {
          component: 'StreamManager',
          participantId,
          trackId: track.id,
          trackKind: track.kind
        });
      } catch (error) {
        this.logger.error(`Errore aggiungendo traccia alla connessione con ${participantId}`, {
          component: 'StreamManager',
          participantId,
          trackId: track.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Rimuove tracce video da tutte le connessioni peer
   * @returns {Promise<void>}
   * @private
   */
  async _removeVideoTracksFromAllPeers() {
    const peerConnections = this.globalState.getAllPeerConnections();
    
    for (const [participantId, pc] of Object.entries(peerConnections)) {
      try {
        const senders = pc.getSenders();
        const videoSenders = senders.filter(sender => 
          sender.track && sender.track.kind === 'video'
        );

        for (const sender of videoSenders) {
          await pc.removeTrack(sender);
          
          this.logger.debug(`Traccia video rimossa dalla connessione con ${participantId}`, {
            component: 'StreamManager',
            participantId,
            trackId: sender.track.id
          });
        }
      } catch (error) {
        this.logger.error(`Errore rimuovendo tracce video dalla connessione con ${participantId}`, {
          component: 'StreamManager',
          participantId,
          error: error.message
        });
      }
    }
  }

  /**
   * Rileva se la traccia è uno screen share
   * @param {RTCTrackEvent} event - Evento traccia
   * @param {string} participantId - ID del partecipante
   * @returns {boolean}
   * @private
   */
  _detectScreenShare(event, participantId) {
    // Controlla metadata di signaling
    const metadata = this.globalState.getStreamMetadata(participantId);
    if (metadata && event.streams.length > 0) {
      const streamId = event.streams[0].id;
      if (metadata[streamId] === 'screenshare') {
        return true;
      }
    }

    // Fallback: controlla label della traccia o ID stream
    const isScreenShareByLabel = 
      event.track.label.includes('screen') ||
      event.track.label.includes('Screen') ||
      event.track.id.includes('screen');

    const isScreenShareByStream = event.streams.length > 0 &&
      event.streams[0].id.includes('screen');

    return isScreenShareByLabel || isScreenShareByStream;
  }

  /**
   * Gestisce stream screen share remoto
   * @param {MediaStream} stream - Stream screen share
   * @param {string} participantId - ID del partecipante
   * @param {RTCTrackEvent} event - Evento traccia
   * @returns {void}
   * @private
   */
  _handleRemoteScreenShare(stream, participantId, event) {
    const streamId = stream.id;
    
    this.logger.info(`Stream screen share remoto ricevuto da ${participantId}`, {
      component: 'StreamManager',
      participantId,
      streamId,
      trackKind: event.track.kind
    });

    // Crea o aggiorna stream screen share
    let screenShareStreams = this.globalState.getRemoteScreenStreams(participantId);
    if (!screenShareStreams) {
      screenShareStreams = {};
    }    if (!screenShareStreams[streamId]) {
      screenShareStreams[streamId] = createMediaStream();
    }

    screenShareStreams[streamId].addTrack(event.track);
    this.globalState.setRemoteScreenStreams(participantId, screenShareStreams);

    // Aggiorna metadata
    this.globalState.setStreamMetadata(participantId, streamId, 'screenshare');

    // Emetti evento per UI
    const eventEmitter = this.globalState.getEventEmitter();
    if (eventEmitter) {
      eventEmitter.emit('stream_added_or_updated', {
        participantId,
        stream: screenShareStreams[streamId],
        streamType: 'screenshare',
        streamId,
        userData: this.globalState.getUserData(participantId)
      });
    }
  }

  /**
   * Gestisce stream webcam remoto
   * @param {MediaStream} stream - Stream webcam
   * @param {string} participantId - ID del partecipante
   * @param {RTCTrackEvent} event - Evento traccia
   * @returns {void}
   * @private
   */
  _handleRemoteWebcamStream(stream, participantId, event) {
    this.logger.info(`Stream webcam remoto ricevuto da ${participantId}`, {
      component: 'StreamManager',
      participantId,
      streamId: stream.id,
      trackKind: event.track.kind
    });    // Crea o aggiorna stream webcam
    let webcamStream = this.globalState.getRemoteStream(participantId);
    if (!webcamStream) {
      webcamStream = createMediaStream();
      this.globalState.setRemoteStream(participantId, webcamStream);
    }

    // Aggiungi traccia se non già presente
    const existingTrack = webcamStream.getTracks().find(track => 
      track.id === event.track.id
    );

    if (!existingTrack) {
      webcamStream.addTrack(event.track);
    }

    // Aggiorna metadata
    this.globalState.setStreamMetadata(participantId, stream.id, 'webcam');

    // Emetti evento per UI
    const eventEmitter = this.globalState.getEventEmitter();
    if (eventEmitter) {
      eventEmitter.emit('stream_added_or_updated', {
        participantId,
        stream: webcamStream,
        streamType: 'webcam',
        streamId: stream.id,
        userData: this.globalState.getUserData(participantId)
      });
    }
  }

  /**
   * Pulisce uno stream (ferma tutte le tracce)
   * @param {MediaStream} stream - Stream da pulire
   * @returns {void}
   * @private
   */
  _cleanupStream(stream) {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }
}

// Default export for Expo Router compatibility
export default StreamManager;
