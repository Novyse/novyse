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
};

export default eventSender;
