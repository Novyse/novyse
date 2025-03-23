import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "./EventEmitter";
import { io } from "socket.io-client";
import APIMethods from "./APImethods";

let socket = null;
let localUserHandle = null;

// const socketAddress = "wss://ws.messanger.bpup.israiken.it/";

const WebSocketMethods = {
  saveParameters: async (localUserIDParam) => {
    localUserID = localUserIDParam;
    console.log("Parametri salvati");
  },

  isWebSocketOpen: () => {
    return socket && socket.connected;
  },

  openWebSocketConnection: async () => {
    const response = await APIMethods.api.get("/user/auth/session");
    const sessionId = response.data.session_id;
    localUserHandle = await localDatabase.fetchLocalUserHandle();
    console.log("Session ID: ", sessionId);

    try {
      if (socket && socket.connected) {
        console.log("Una connessione Socket.IO era già aperta");
        return;
      } else if (socket) {
        socket.disconnect();
        socket = null;
      }

      socket = io("wss://io.messanger.bpup.israiken.it/", {
        transports: ["websocket"],
        autoConnect: true,
        reconnectionAttempts: -1,
        auth: {
          sessionId: sessionId,
        },
      });

      socket.on("connect", async () => {
        console.log("Connessione Socket.IO aperta");
        await WebSocketMethods.socketReceiver();
        eventEmitter.emit("webSocketOpen");
      });

      socket.on("connect_error", (error) => {
        console.log("Socket.IO connection error:", error);
      });

      socket.on("disconnect", () => {
        console.log("Connessione Socket.IO chiusa");
      });
    } catch (error) {
      console.error("Socket.IO initialization error:", error);
    }
  },

  //richiedo l'init
  init: async () => {
    try {
      socket.emit("init");
      console.log("Init inviato alla socket.io");
    } catch (error) {
      console.log(error);
    }
  },

  sendNewMessage: async (data) => {
    try {
      socket.emit("send_message", data);
    } catch (error) {
      console.log(error);
    }
  },

  // Gestisco quando il socket.io mi ritorna un messaggio
  socketReceiver: async () => {
    if (!socket) {
      console.log("Socket.IO non inizializzata (socketReceiver)");
      return;
    }

    socket.on("receive_message", async (data) => {
      const { message_id, chat_id, text, sender, date } = data;

      const ChatAlreadyInDatabaseawait = await localDatabase.insertChat(
        chat_id,
        ""
      );

      if (!ChatAlreadyInDatabaseawait) {
        const users = await APIMethods.getChatMembers(chat_id);
        console.log("Users in chat:", users);
        for (const user of users) {
          if (user != localUserHandle) {
            console.log("Utente da inserire nella chat:", user);
            await localDatabase.insertChatAndUsers(chat_id, user);
            await localDatabase.insertUsers(user);
          }
        }
        eventEmitter.emit("newChat");
      }

      const MessageAlreadyInDatabase = await localDatabase.insertMessage(
        message_id,
        chat_id,
        text,
        sender,
        date,
        ""
      );

      if (MessageAlreadyInDatabase) {
        eventEmitter.emit("updateNewLastMessage", data);
        eventEmitter.emit("newMessage", data);
        console.log(
          `Database insertMessage for message_id ${message_id} in chat ${chat_id} completed`
        );
        console.log(`Nuovo messaggio ricevuto da ${sender}`);
      }
    });

    return "return of socket.io receiver function";
  },
};

export default WebSocketMethods;
