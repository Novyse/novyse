import WebRTCLogger from "../logging/WebRTCLogger.js";
import EventEmitter from "../utils/EventEmitter.js";

/**
 * StreamMappingManager - Gestisce il mapping locale tra MID dei transceiver e streamUUID
 * Implementa la tecnologia di identificazione delle stream tramite MID senza signaling
 */
export class StreamMappingManager {
  constructor(globalState, logger) {
    this.globalState = globalState;
    this.logger = logger || WebRTCLogger;

    this.midToStreaumUUIDMapping = {};

    // Struttura
    /*
      midToStreaumUUIDMapping = {
        participantUUID: {
          mid: streamUUID,
          ...
        }
      }
    */

    this.logger.debug("StreamMappingManager inizializzato", {
      component: "StreamMappingManager",
    });
  }

  addLocalStreamMapping(remoteParticipantUUID,streamUUID, mid) {
    const participantUUID = this.globalState.getMyId();
    this.addStreamMapping(participantUUID, streamUUID, mid);

    if(!remoteParticipantUUID || !participantUUID || !streamUUID || !mid) {
      this.logger.error("addLocalStreamMapping: Parametri mancanti", {
        remoteParticipantUUID,
        participantUUID,
        streamUUID,
        mid,
      });
      return;
    }

    EventEmitter.sendMIDtoStreamUUIDMapping(
      remoteParticipantUUID,
      participantUUID,
      streamUUID,
      mid
    );

  }

  addStreamMapping(participantUUID, streamUUID, mid) {
    // Inizializza oggetto se non esiste
    if (!this.midToStreaumUUIDMapping[participantUUID]) {
      this.midToStreaumUUIDMapping[participantUUID] = {};
    }

    // Assegna direttamente mid → streamUUID
    this.midToStreaumUUIDMapping[participantUUID][mid] = streamUUID;

    this.logger.info("Mapping mid→streamUUID aggiunto o aggiornato", {
      component: "StreamMappingManager",
      participantUUID,
      mid,
      streamUUID,
    });
  }

  getStreamUUIDByMid(participantUUID, mid) {
    const participantMapping = this.midToStreaumUUIDMapping[participantUUID];
    if (!participantMapping) {
      this.logger.warning("Nessun mapping trovato per il partecipante", {
        component: "StreamMappingManager",
        participantUUID,
        mid,
      });
      return null;
    }
    const streamUUID = participantMapping[mid];
    if (!streamUUID) {
      this.logger.warning("Nessun streamUUID trovato per il MID", {
        component: "StreamMappingManager",
        participantUUID,
        mid,
      });
      return null;
    }
    this.logger.debug("StreamUUID trovato per il MID", {
      component: "StreamMappingManager",
      participantUUID,
      mid,
      streamUUID,
    });
    return streamUUID;
  }

  removeMappingByMid(participantUUID, mid) {
    const participantMapping = this.midToStreaumUUIDMapping[participantUUID];
    if (!participantMapping || !participantMapping[mid]) {
      this.logger.warning("Nessun mapping da rimuovere per il MID", {
        component: "StreamMappingManager",
        participantUUID,
        mid,
      });
      return;
    }

    delete participantMapping[mid];
    this.logger.info("Mapping rimosso con successo", {
      component: "StreamMappingManager",
      participantUUID,
      mid,
    });
  }

  getAllMappings() {
    this.logger.debug("Tutti i mapping ottenuti", {
      component: "StreamMappingManager",
      mappings: this.midToStreaumUUIDMapping,
    });
    return this.midToStreaumUUIDMapping;
  }

  /**
   * Pulisce tutte le mappe
   * @returns {void}
   */
  cleanup() {
    this.midToStreaumUUIDMapping = {};
    this.logger.debug("Tutti i mapping puliti", {
      component: "StreamMappingManager",
    });
  }
}

export default StreamMappingManager;
