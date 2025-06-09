import WebRTCLogger from "../logging/WebRTCLogger.js";

/**
 * StreamMappingManager - Gestisce il mapping locale tra MID dei transceiver e streamUUID
 * Implementa la tecnologia di identificazione delle stream tramite MID senza signaling
 */
export class StreamMappingManager {
  constructor(globalState, logger) {
    this.globalState = globalState;
    this.logger = logger || WebRTCLogger;

    // Map che tiene traccia del mapping mid → streamUUID per i transceiver locali
    // Struttura: { mid: { streamUUID, trackType, participantId } }
    this.localMidToStreamMapping = new Map();

    // Map che tiene traccia del mapping streamUUID → mid per i transceiver locali
    // Struttura: { streamUUID: { mid, trackType, participantId } }
    this.localStreamToMidMapping = new Map();

    // Map per identificare le track remote in base al loro arrivo
    // Struttura: { participantId: { trackId: streamUUID } }
    this.remoteTrackMapping = new Map();

    this.logger.debug("StreamMappingManager inizializzato", {
      component: "StreamMappingManager",
    });
  }
  /**
   * Registra il mapping di un transceiver locale quando viene aggiunto al sender
   * @param {RTCRtpTransceiver} transceiver - Il transceiver
   * @param {string} streamUUID - L'UUID dello stream
   * @param {string} trackType - Tipo di track ("webcam", "screenshare")
   * @param {string} participantId - ID del partecipante destinatario (per logging)
   * @returns {void}
   */
  registerLocalTransceiverMapping(
    transceiver,
    streamUUID,
    trackType,
    participantId = null
  ) {
    if (!transceiver.mid) {
      this.logger.warning(
        "Transceiver non ha ancora un MID, non posso registrare il mapping",
        {
          component: "StreamMappingManager",
          streamUUID,
          trackType,
          participantId,
        }
      );
      return;
    }

    const mappingData = {
      streamUUID,
      trackType,
      participantId,
      timestamp: Date.now(),
    };

    // Registra il mapping in entrambe le direzioni
    this.localMidToStreamMapping.set(transceiver.mid, mappingData);
    this.localStreamToMidMapping.set(streamUUID, {
      mid: transceiver.mid,
      trackType,
      participantId,
      timestamp: Date.now(),
    });

    this.logger.info("Mapping transceiver locale registrato", {
      component: "StreamMappingManager",
      mid: transceiver.mid,
      streamUUID,
      trackType,
      participantId,
    });
  }

  /**
   * Registra il mapping di una track remota ricevuta
   * @param {string} participantId - ID del partecipante
   * @param {string} trackId - ID della track
   * @param {string} streamUUID - UUID dello stream
   * @param {string} trackType - Tipo di track
   * @returns {void}
   */
  registerRemoteTrackMapping(participantId, trackId, streamUUID, trackType) {
    if (!this.remoteTrackMapping.has(participantId)) {
      this.remoteTrackMapping.set(participantId, new Map());
    }

    const participantMappings = this.remoteTrackMapping.get(participantId);
    participantMappings.set(trackId, {
      streamUUID,
      trackType,
      timestamp: Date.now(),
    });

    this.logger.info("Mapping track remota registrato", {
      component: "StreamMappingManager",
      participantId,
      trackId,
      streamUUID,
      trackType,
    });
  }
  /**
   * Recupera lo streamUUID basato sul MID di un transceiver locale
   * @param {string} mid - MID del transceiver
   * @returns {Object|null} Oggetto mapping o null se non trovato
   */
  getStreamUUIDByMid(mid) {
    const mappingData = this.localMidToStreamMapping.get(mid);

    if (mappingData) {
      this.logger.debug("Mapping locale trovato per MID", {
        component: "StreamMappingManager",
        mid,
        streamUUID: mappingData.streamUUID,
        trackType: mappingData.trackType,
      });
    }

    return mappingData || null;
  }

  /**
   * Recupera il MID basato sullo streamUUID locale
   * @param {string} streamUUID - UUID dello stream
   * @returns {Object|null} Oggetto mapping o null se non trovato
   */
  getMidByStreamUUID(streamUUID) {
    const mappingData = this.localStreamToMidMapping.get(streamUUID);
    return mappingData || null;
  }

  /**
   * Recupera lo streamUUID per una track remota
   * @param {string} participantId - ID del partecipante
   * @param {string} trackId - ID della track
   * @returns {Object|null} Oggetto mapping o null se non trovato
   */
  getRemoteTrackMapping(participantId, trackId) {
    const participantMappings = this.remoteTrackMapping.get(participantId);
    if (!participantMappings) {
      return null;
    }

    return participantMappings.get(trackId) || null;
  }

  /**
   * Genera lo streamUUID per una track
   * @param {string} participantId - ID del partecipante
   * @param {string} trackType - Tipo di track ("webcam", "screenshare")
   * @param {string|null} screenShareId - ID dello screen share (solo per screenshare)
   * @returns {string} streamUUID generato
   */
  generateStreamUUID(participantId, trackType, screenShareId = null) {
    if (trackType === "screenshare" && screenShareId) {
      // Per screen share: partecipantId_StreamID
      return `${participantId}_${screenShareId}`;
    } else {
      // Per track normali (webcam): solo participantId
      return participantId;
    }
  }
  /**
   * Rimuove tutti i mapping per un partecipante
   * @param {string} participantId - ID del partecipante
   * @returns {void}
   */
  clearMappingsForParticipant(participantId) {
    // Rimuovi mapping track remote per questo partecipante
    this.remoteTrackMapping.delete(participantId);

    this.logger.info("Mapping rimossi per partecipante", {
      component: "StreamMappingManager",
      participantId,
    });
  }

  /**
   * Rimuove un mapping locale specifico
   * @param {string} mid - MID del transceiver
   * @returns {void}
   */
  removeMappingByMid(mid) {
    const mappingData = this.localMidToStreamMapping.get(mid);

    if (mappingData) {
      this.localMidToStreamMapping.delete(mid);
      this.localStreamToMidMapping.delete(mappingData.streamUUID);

      this.logger.info("Mapping locale rimosso", {
        component: "StreamMappingManager",
        mid,
        streamUUID: mappingData.streamUUID,
      });
    }
  }

  /**
   * Rimuove un mapping di track remota
   * @param {string} participantId - ID del partecipante
   * @param {string} trackId - ID della track
   * @returns {void}
   */
  removeRemoteTrackMapping(participantId, trackId) {
    const participantMappings = this.remoteTrackMapping.get(participantId);
    if (participantMappings) {
      const mappingData = participantMappings.get(trackId);
      if (mappingData) {
        participantMappings.delete(trackId);

        this.logger.info("Mapping track remota rimosso", {
          component: "StreamMappingManager",
          participantId,
          trackId,
          streamUUID: mappingData.streamUUID,
        });
      }
    }
  }

  /**
   * Ottiene tutti i mapping locali
   * @returns {Object} Oggetto con tutti i mapping locali
   */
  getAllLocalMappings() {
    return {
      midToStream: Object.fromEntries(this.localMidToStreamMapping),
      streamToMid: Object.fromEntries(this.localStreamToMidMapping),
    };
  }

  /**
   * Ottiene tutti i mapping per un partecipante remoto
   * @param {string} participantId - ID del partecipante
   * @returns {Object} Oggetto con tutti i mapping per il partecipante
   */
  getAllRemoteMappingsForParticipant(participantId) {
    const participantMappings = this.remoteTrackMapping.get(participantId);
    return participantMappings ? Object.fromEntries(participantMappings) : {};
  }
  /**
   * Pulisce tutte le mappe
   * @returns {void}
   */
  cleanup() {
    this.localMidToStreamMapping.clear();
    this.localStreamToMidMapping.clear();
    this.remoteTrackMapping.clear();

    this.logger.info("StreamMappingManager pulito", {
      component: "StreamMappingManager",
    });
  }
}

export default StreamMappingManager;
