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

    socket.on("new_message", async (message) => {
      await setLastUpdateTimestamp(message.created_at);

      await eventEmitter.newMessage(message);
    });

    socket.on("message:update", async (data) => {
      console.log("Received message:update event:", data);
      await setLastUpdateTimestamp(data.updated_at);
      await eventEmitter.message.update(
        data.chatUUID,
        data.messageID,
        data.action,
        data,
      );
    });

    socket.on("new_chat", async (data) => {
      console.log("Received new_chat event:", data);

      const { chat, messages } = data;

      const timestamp =
        messages && messages.length > 0
          ? messages[messages.length - 1].created_at
          : chat.created_at;
      await setLastUpdateTimestamp(timestamp);

      await eventEmitter.newChat(chat, messages);
    });

    socket.on("user_joined", async (data) => {
      console.log("Received user_joined event:", data);

      await setLastUpdateTimestamp(data.user.joined_at);
      await eventEmitter.userJoined(data.chatUUID, data.user);
    });

    socket.on("user:profile:update", async (data) => {
      console.log("Received user:profile:update event:", data);
      await setLastUpdateTimestamp(data.updated_at);

      await eventEmitter.user.profile.update(data);
    });

    socket.on("chat:pin:add", async (data) => {
      console.log("Received chat_pinned event:", data);

      await setLastUpdateTimestamp(data.pinned_at);
      await eventEmitter.chat.pin.add(data.chatUUID);
    });

    socket.on("chat:pin:remove", async (data) => {
      console.log("Received chat_unpinned event:", data);

      await setLastUpdateTimestamp(data.unpinned_at);
      await eventEmitter.chat.pin.remove(data.chatUUID);
    });

    // socket.on("user_left", async (data) => {
    //   console.log("Received user_left event:", data);
    //   await setLastUpdateTimestamp(data.left_at);
    //   await eventEmitter.userLeft(data.chatUUID, data.user);;
    // });
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
