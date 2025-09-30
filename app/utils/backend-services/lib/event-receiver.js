import eventEmitter from "../../global/Events/EventEmitter.js";

import auth from "../../welcome/auth.js";

let socket = null;

const eventReceiver = {
  initialize: async (sock) => {
    socket = sock;

    socket.on("new_message", async (message) => {
      console.log("Received new_message event:", message);

      await setLastUpdateTimestamp(message.created_at);

      await eventEmitter.newMessage(message);
    });

    socket.on("new_chat", async (chat) => {
      console.log("Received new_chat event:", chat);

      await setLastUpdateTimestamp(chat.created_at);

      await eventEmitter.newChat(chat);
    });

    socket.on("user_joined", async (data) => {
      console.log("Received user_joined event:", data);

      await setLastUpdateTimestamp(data.user.joined_at);
      await eventEmitter.userJoined(data.chatUUID, data.user);
    });

    // socket.on("user_left", async (data) => {
    //   console.log("Received user_left event:", data);
    //   await setLastUpdateTimestamp(data.left_at);
    //   await eventEmitter.userLeft(data.chatUUID, data.user);;
    // });

    // -------------------- WebRTC EVENTS --------------------

    socket.on("comms_join", async (data) => {
      eventEmitter.commsJoin(data);
    });

    socket.on("comms_leave", async (data) => {
      eventEmitter.commsLeave(data);
    });

    socket.on("comms_screen_share_start", async (data) => {
      eventEmitter.commsScreenShareStart({
        from: data.from,
        chatUUID: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });
    socket.on("comms_screen_share_stop", async (data) => {
      eventEmitter.commsScreenShareStop({
        from: data.from,
        chatUUID: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });

    // Relay WebRTC signaling events

    socket.on("comms_candidate", async (data) => {
      eventEmitter.commsCandidate(data);
    });

    socket.on("comms_answer", async (data) => {
      eventEmitter.commsAnswer(data);
    });

    socket.on("comms_offer", async (data) => {
      eventEmitter.commsOffer(data);
    });

    socket.on("comms_speaking", async (data) => {
      eventEmitter.commsSpeaking({
        id: data.from,
        chatUUID: data.to,
      });
    });
    socket.on("comms_not_speaking", async (data) => {
      eventEmitter.commsNotSpeaking({
        id: data.from,
        chatUUID: data.to,
      });
    });

    socket.on("comms_mid_to_uuid_mapping", async (data) => {
      eventEmitter.commsMidToUUIDMapping({
        from: data.from,
        to: data.to,
        streamUUID: data.streamUUID,
        mid: data.mid,
      });
    });

    socket.on("comms_webcam_on", async (data) => {
      eventEmitter.commsWebcamOn({
        from: data.from,
        chatUUID: data.to,
      });
    });

    socket.on("comms_webcam_off", async (data) => {
      eventEmitter.commsWebcamOff({
        from: data.from,
        chatUUID: data.to,
      });
    });
  },
};

const setLastUpdateTimestamp = async (timestamp) => {
  await auth.setLastUpdateTimestamp(timestamp);
};

// const updateLastWebSocketActionDateTime = async (date) => {
//   await AsyncStorage.setItem("lastUpdateDateTime", date);
//   console.log("lastUpdateDateTime: ", date);
// };

export default eventReceiver;
