import eventEmitter from "../../global/Events/lib/EventEmitter";
import SocketIO from "../../backend-services/socket-io";

const EventEmitter = {
  sendMIDtoStreamUUIDMapping: async (
    toPartecipantUUID,
    partecipantUUID,
    streamUUID,
    mid
  ) => {
    if (!toPartecipantUUID || !partecipantUUID || !streamUUID || !mid) {
      console.error("sendMIDtoStreamUUIDMapping: Missing parameters", {
        toPartecipantUUID,
        partecipantUUID,
        streamUUID,
        mid,
      });
      return;
    }

    await SocketIO.send().sendMIDtoUUIDMapping(
      toPartecipantUUID,
      partecipantUUID,
      streamUUID,
      mid
    );
  },

  sendLocalUpdateNeeded: (partecipantUUID, streamUUID, stream = null, action = 'add_or_update') => {
    if (!partecipantUUID || !streamUUID) {
      console.error("sendLocalUpdateNeeded: Missing parameters", {
        partecipantUUID,
        streamUUID,
        stream,
      });
      return;
    }

    eventEmitter.emit("ui_update", {
      deviceUUID: partecipantUUID,
      stream,
      streamUUID: streamUUID,
      action: action,
    });
  },

  sendWebcamStatus: async (deviceUUID, commUUID, status = false) => {
    if (!deviceUUID || !commUUID) {
      console.error("sendWebcamStatus: Missing parameters", {
        deviceUUID,
        commUUID,
        status,
      });
      return;
    }

    await SocketIO.send().sendWebcamStatus(
      deviceUUID,
      commUUID,
      status
    );
  }
};

export default EventEmitter;
