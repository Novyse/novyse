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

  sendLocalUpdateNeeded: (partecipantUUID, streamUUID, stream = null) => {
    if (!partecipantUUID || !streamUUID) {
      console.error("sendLocalUpdateNeeded: Missing parameters", {
        partecipantUUID,
        streamUUID,
        stream,
      });
      return;
    }

    eventEmitter.emit("stream_added_or_updated", {
      participantUUID: partecipantUUID,
      stream,
      streamUUID: streamUUID,
      timestamp: Date.now(),
    });
  },
};

export default EventEmitter;
