let socket = null;

const eventSender = {
  initialize: (sock) => {
    socket = sock;
  },

  IceCandidate: async (data) => {
    socket.emit("comms_candidate", data);
  },

  RTCOffer: async (data) => {
    socket.emit("comms_offer", data);
  },
  RTCAnswer: async (data) => {
    socket.emit("comms_answer", data);
  },
  sendSpeakingStatus: async (commsId, partecipantId, isSpeaking) => {
    const eventType = isSpeaking ? "comms_speaking" : "comms_not_speaking";
    const data = {
      to: commsId,
      from: partecipantId,
    };
    socket.emit(eventType, data);
  },
  sendMIDtoUUIDMapping: async (toPartecipantUUID, from, streamUUID, mid) => {
    const data = {
      to: toPartecipantUUID,
      from: from,
      streamUUID: streamUUID,
      mid: mid,
    };
    socket.emit("comms_mid_to_uuid_mapping", data);
  },

  sendWebcamStatus: async (from, chatUUID, isOn) => {
    const eventType = isOn ? "comms_webcam_on" : "comms_webcam_off";
    const data = {
      to: chatUUID,
      from: from,
    };
    socket.emit(eventType, data);
  },
};

export default eventSender;
