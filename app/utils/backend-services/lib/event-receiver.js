import eventEmitter from "../../global/Events/EventEmitter.js";

let socket = null;

const eventReceiver = {
  initialize: async (sock) => {
    socket = sock;

    socket.on("new_message", async (message) => {
      console.log("Received new_message event:", message);

      await eventEmitter.newMessage(message);
    });

    // @SamueleOrazioDurante forse da mettere evento new_chat
  },
};

// const updateLastWebSocketActionDateTime = async (date) => {
//   await AsyncStorage.setItem("lastUpdateDateTime", date);
//   console.log("lastUpdateDateTime: ", date);
// };

export default eventReceiver;
