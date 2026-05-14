let socket = null;

const eventSender = {
  initialize: (sock) => {
    socket = sock;
  },

  activity(chatUUID, action) {
    socket.emit("chat:member:activity", { chatUUID, action });
  },
};

export default eventSender;
