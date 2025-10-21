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
      midToStreamUUIDMapping = {
        myDeviceUUID: {
          mid: streamUUID,
          ...
        }
      }
    */

    this.logger.debug("StreamMappingManager inizializzato", {
      component: "StreamMappingManager",
    });
  }

  addLocalStreamMapping(deviceUUID, streamUUID, mid) {
    const myDeviceUUID = this.globalState.getDeviceUUID();
    this.addStreamMapping(myDeviceUUID, streamUUID, mid);

    if (!deviceUUID || !myDeviceUUID || !streamUUID || !mid) {
      this.logger.error("addLocalStreamMapping: Parametri mancanti", {
        deviceUUID,
        myDeviceUUID,
        streamUUID,
        mid,
      });
      return;
    }

    EventEmitter.sendMIDtoStreamUUIDMapping(
      deviceUUID,
      myDeviceUUID,
      streamUUID,
      mid
    );
  }

  addStreamMapping(myDeviceUUID, streamUUID, mid) {
    // Inizializza oggetto se non esiste
    if (!this.midToStreaumUUIDMapping[myDeviceUUID]) {
      this.midToStreaumUUIDMapping[myDeviceUUID] = {};
    }

    // Assegna direttamente mid → streamUUID
    this.midToStreaumUUIDMapping[myDeviceUUID][mid] = streamUUID;

    this.logger.info("Mapping mid→streamUUID aggiunto o aggiornato", {
      component: "StreamMappingManager",
      myDeviceUUID,
      mid,
      streamUUID,
    });
  }

  getStreamUUIDByMid(myDeviceUUID, mid) {
    const participantMapping = this.midToStreaumUUIDMapping[myDeviceUUID];
    if (!participantMapping) {
      this.logger.warning("Nessun mapping trovato per il partecipante", {
        component: "StreamMappingManager",
        myDeviceUUID,
        mid,
      });
      return null;
    }
    const streamUUID = participantMapping[mid];
    if (!streamUUID) {
      this.logger.warning("Nessun streamUUID trovato per il MID", {
        component: "StreamMappingManager",
        myDeviceUUID,
        mid,
      });
      return null;
    }
    this.logger.debug("StreamUUID trovato per il MID", {
      component: "StreamMappingManager",
      myDeviceUUID,
      mid,
      streamUUID,
    });
    return streamUUID;
  }

  removeMappingByMid(myDeviceUUID, mid) {
    const participantMapping = this.midToStreaumUUIDMapping[myDeviceUUID];
    if (!participantMapping || !participantMapping[mid]) {
      this.logger.warning("Nessun mapping da rimuovere per il MID", {
        component: "StreamMappingManager",
        myDeviceUUID,
        mid,
      });
      return;
    }

    delete participantMapping[mid];
    this.logger.info("Mapping rimosso con successo", {
      component: "StreamMappingManager",
      myDeviceUUID,
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
