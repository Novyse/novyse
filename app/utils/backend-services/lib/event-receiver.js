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

    // -------------------- WebRTC EVENTS --------------------

    socket.on("comms_join", async (data) => {
      eventEmitter.emit("comms_join", data);
    });

    socket.on("comms_leave", async (data) => {
      eventEmitter.emit("comms_leave", data);
    });

    socket.on("comms_screen_share_start", async (data) => {
      eventEmitter.emit("comms_screen_share_start", {
        from: data.from,
        chatUUID: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });
    socket.on("comms_screen_share_stop", async (data) => {
      eventEmitter.emit("comms_screen_share_stop", {
        from: data.from,
        chatUUID: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });

    // Relay WebRTC signaling events

    socket.on("comms_candidate", async (data) => {
      eventEmitter.emit("comms_candidate", data);
    });

    socket.on("comms_answer", async (data) => {
      eventEmitter.emit("comms_answer", data);
    });

    socket.on("comms_offer", async (data) => {
      eventEmitter.emit("comms_offer", data);
    });

    socket.on("comms_speaking", async (data) => {
      eventEmitter.emit("comms_speaking", {
        id: data.from,
        chatUUID: data.to,
      });
    });
    socket.on("comms_not_speaking", async (data) => {
      eventEmitter.emit("comms_not_speaking", {
        id: data.from,
        chatUUID: data.to,
      });
    });

    socket.on("comms_mid_to_uuid_mapping", async (data) => {
      eventEmitter.emit("comms_mid_to_uuid_mapping", {
        from: data.from,
        to: data.to,
        mid: data.mid,
        streamUUID: data.streamUUID,
      });
    });

    socket.on("comms_webcam_on", async (data) => {
      eventEmitter.emit("comms_webcam_on", {
        from: data.from,
        chatUUID: data.to,
      });
    });

    socket.on("comms_webcam_off", async (data) => {
      eventEmitter.emit("comms_webcam_off", {
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
