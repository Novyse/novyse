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
