import eventEmitter from "../../EventEmitter";
import WebSocketMethods from "../../webSocketMethods";

const EventEmitter = {
  sendMIDtoStreamUUIDMapping: (toPartecipantUUID,partecipantUUID, streamUUID, mid) => {
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
      mid,
    );
  },
};

export default EventEmitter;