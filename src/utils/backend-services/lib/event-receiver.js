import eventEmitter from "../../global/Events/EventEmitter.js";

import auth from "../../welcome/auth.js";

let socket = null;
let initialized = false;

const eventReceiver = {
  initialize: async (sock) => {
    if (initialized) {
      console.warn("eventReceiver already initialized, skipping");
      return;
    }
    socket = sock;
    initialized = true;

    socket.onAny(async (eventName, ...args) => {
      const data = args[0];
      console.log(`[Socket event] ${eventName}:`, data);

      if (data && data.at) {
        await _setLastUpdateTimestamp(data.at);
      } else {
        console.warn("No timestamp found for event:", eventName);
      }
    });

    socket.on("message:new", async (message) => {
      await eventEmitter.newMessage(message);
    });

    socket.on("message:update", async (data) => {
      await eventEmitter.message.update(
        data.chatUUID,
        data.messageID,
        data.action,
        data,
      );
    });

    socket.on("chat:new", async (data) => {
      const { chat, messages } = data;

      await eventEmitter.newChat(chat, messages);
    });

    socket.on("chat:update", async (data) => {
      await eventEmitter.chat.update(data.chatUUID, data.action, data);
    });

    socket.on("user_joined", async (data) => {
      await eventEmitter.userJoined(data.chatUUID, data.user);
    });

    socket.on("user:profile:update", async (data) => {
      await eventEmitter.user.profile.update(data);
    });

    // socket.on("user_left", async (data) => {
    //   console.log("Received user_left event:", data);
    //   await setLastUpdateTimestamp(data.left_at);
    //   await eventEmitter.userLeft(data.chatUUID, data.user);;
    // });
  },
};

const _setLastUpdateTimestamp = async (timestamp) => {
  await auth.setLastUpdateTimestamp(timestamp);
};

// const updateLastWebSocketActionDateTime = async (date) => {
//   await AsyncStorage.setItem("lastUpdateDateTime", date);
//   console.log("lastUpdateDateTime: ", date);
// };

export default eventReceiver;
