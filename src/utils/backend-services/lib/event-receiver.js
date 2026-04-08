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
      await eventEmitter.message.new(message);
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
      await eventEmitter.chat.new(data.chat, data.users);
    });

    socket.on("chat:update", async (data) => {
      await eventEmitter.chat.update(data.chatUUID, data.action, data);
    });

    socket.on("chat:member:joined", async (data) => {
      const chatUUID = data.chat.uuid;
      await eventEmitter.chat.member.join(chatUUID, data.user);
    });

    socket.on("user:profile:update", async (data) => {
      await eventEmitter.user.profile.update(data);
    });
    
    socket.on("user_online", async (data) => {
      await eventEmitter.presence.update(data.userUUID, true);
    });

    socket.on("user_offline", async (data) => {
      await eventEmitter.presence.update(data.userUUID, false);
    });

    // socket.on("chat:member:left", async (data) => {
    //   console.log("Received user_left event:", data);
    //   await setLastUpdateTimestamp(data.left_at);
    //   await eventEmitter.chat.member.leave(data.chatUUID, data.user);;
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
