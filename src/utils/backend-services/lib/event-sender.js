let socket = null;

const eventSender = {
  initialize: (sock) => {
    socket = sock;
  },

  // ------ CHAT SUBSCRIBTION ------

  subscribe(chatHandle) {
    socket.emit("chat_subscribe", { handle: chatHandle });
  },
  unsubscribe() {
    socket.emit("chat_unsubscribe");
  },
  // ------ WEBRTC EVENTS ------

  retrieveCommData(commUUID) {
    socket.emit("comms_retrieve_comms_data", { commUUID });
  },
  joinComm(commUUID, handle) {
    socket.emit("comms_join", { commUUID, handle });
  },

  leaveComm(commUUID) {
    socket.emit("comms_leave", { commUUID });
  },

  startScreenShare(commUUID) {
    socket.emit("comms_screen_share_start", { commUUID });
  },
  stopScreenShare(commUUID, screenShareUUID) {
    socket.emit("comms_screen_share_stop", {
      commUUID,
      screenShareUUID,
    });
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
  sendSpeakingStatus: async (commUUID, deviceUUID, isSpeaking) => {
    const eventType = isSpeaking ? "comms_speaking" : "comms_not_speaking";
    const data = {
      commUUID,
      deviceUUID,
    };
    socket.emit(eventType, data);
  },
  sendMIDtoUUIDMapping: async (deviceUUID, toDeviceUUID, streamUUID, mid) => {
    const data = {
      deviceUUID,
      toDeviceUUID,
      streamUUID,
      mid,
    };
    console.log("[DEBUGGING] [SENDER]", "comms_mid_to_uuid_mapping", data);
    socket.emit("comms_mid_to_uuid_mapping", data);
  },

  sendWebcamStatus: async (deviceUUID, commUUID, isOn) => {
    const eventType = isOn ? "comms_webcam_on" : "comms_webcam_off";
    const data = {
      deviceUUID,
      commUUID,
    };
    socket.emit(eventType, data);
  },
};

export default eventSender;
