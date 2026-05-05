import eventEmitter from "../../global/Events/EventEmitter.js";

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

    socket.on("user:profile:update", async (data) => {
      await eventEmitter.user.profile.update(data);
    });

    socket.on("user:presence:online", async (data) => {
      await eventEmitter.user.presence.update(data.userUUID, "ONLINE");
    });

    socket.on("user:presence:offline", async (data) => {
      await eventEmitter.user.presence.update(
        data.userUUID,
        "OFFLINE",
        data.lastAccessAt,
      );
    });

    socket.on("message:new", async (message) => {
      await eventEmitter.message.new(message);
    });

    socket.on("message:read", async (data) => {
      await eventEmitter.message.read(
        data.chatUUID,
        data.messageID,
        data.readerUUID,
        data.readAt,
      );
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

    socket.on("chat:member:activity", async (data) => {
      await eventEmitter.chat.member.activity(
        data.chatUUID,
        data.userUUID,
        data.action,
      );
    });

    // socket.on("chat:member:left", async (data) => {
    //   console.log("Received user_left event:", data);
    //   await eventEmitter.chat.member.leave(data.chatUUID, data.user);;
    // });
  },
};

export default eventReceiver;
