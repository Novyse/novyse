import eventEmitter from "../../EventEmitter";
import WebSocketMethods from "../../webSocketMethods";

const EventEmitter = {
  sendMIDtoStreamUUIDMapping: (
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

    WebSocketMethods.sendMIDtoUUIDMapping(
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
      participantUUID: partecipantUUID,
      stream,
      streamUUID: streamUUID,
      action: action,
    });
  },
};

export default EventEmitter;
