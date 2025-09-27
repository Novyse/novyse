let socket = null;

const eventSender = {
  initialize: (sock) => {
    socket = sock;
  },

  // Move all send methods from SocketIO here
  IceCandidate: async (data) => {
    if (!socket || !socket.connected) {
      console.error("Cannot send candidate: Socket not connected");
      return;
    }
    socket.emit("candidate", data);
  },

  RTCOffer: async (data) => {
    if (!socket || !socket.connected) {
      console.error("Cannot send RTC offer: Socket not connected", {
        socketExists: !!socket,
        socketConnected: socket?.connected,
        data,
      });
      return false;
    }
    try {
      console.log("Sending RTC offer via WebSocket", {
        to: data.to,
        from: data.from,
        hasOffer: !!data.offer,
      });
      socket.emit("offer", data);
      console.log("RTC offer sent successfully", {
        to: data.to,
        from: data.from,
      });
      return true;
    } catch (error) {
      console.error("Error sending RTC offer", { error: error.message, data });
      return false;
    }
  },
};

export default eventSender;
