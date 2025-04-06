import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "./EventEmitter";
import { io } from "socket.io-client";
import APIMethods from "./APImethods";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket = null;
let localUserHandle = null;

// const socketAddress = "wss://ws.messanger.bpup.israiken.it/";

const WebSocketMethods = {
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

      socket = io("wss://io.buzz.israiken.it", {
        path:"/test/io",
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

  // Gestisco quando il socket.io mi ritorna un messaggio
  socketReceiver: async () => {
    if (!socket) {
      console.log("Socket.IO non inizializzata (socketReceiver)");
      return;
    }

    socket.on("receive_message", async (data) => {
      const { message_id, chat_id, text, sender, date } = data;

      await WebSocketMethods.UpdateLastWebSocketActionDateTime(date);

      const ChatAlreadyInDatabaseawait = await localDatabase.insertChat(
        chat_id,
        ""
      );

      if (!ChatAlreadyInDatabaseawait) {
        const users = await APIMethods.getChatMembers(chat_id);
        for (const user of users) {
          if (user != localUserHandle) {
            await localDatabase.insertChatAndUsers(chat_id, user);
            await localDatabase.insertUsers(user);
          }
        }
        eventEmitter.emit("newChat", { newChatId: chat_id });
      }

      const MessageAlreadyInDatabase = await localDatabase.insertMessage(
        message_id,
        chat_id,
        text,
        sender,
        date,
        ""
      );

      if (!MessageAlreadyInDatabase) {
        eventEmitter.emit("updateNewLastMessage", data);
        eventEmitter.emit("newMessage", data);
      }
    });

    // quando qualcuno crea un gruppo e mi aggiunge
    socket.on("group_created", async (data) => {
      const { chat_id, name, description, members, admins, date } = data;

      await WebSocketMethods.UpdateLastWebSocketActionDateTime(date);

      //fare un metodo per favore
      await localDatabase.insertChat(chat_id, name);
      console.log(`Database insertChat for chat_id ${chat_id} completed`);

      for (const user of members) {
        if (user.handle != localUserHandle) {
          await localDatabase.insertChatAndUsers(chat_id, user.handle);
          await localDatabase.insertUsers(user.handle);
        }

        console.log(
          `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat_id} completed`
        );
      }

      eventEmitter.emit("newChat", { newChatId: chat_id });

      console.log("🟢 Group created");
    });

    // notifica tutti i membri del gruppo quando un nuovo utente joina il gruppo
    socket.on("group_member_joined", async (data) => {
      const { chat_id, handle, date } = data;

      await WebSocketMethods.UpdateLastWebSocketActionDateTime(date);

      await localDatabase.insertChatAndUsers(chat_id, handle);
      console.log("🟢 Group member joined");
    });

    // quando mi inserisco (in autonomia) in un gruppo
    socket.on("member_joined_group", async (data) => {
      const { group_name, chat_id, members, messages, date } = data;

      await WebSocketMethods.UpdateLastWebSocketActionDateTime(date);

      await localDatabase.insertChat(chat_id, group_name);
      console.log(`Database insertChat for chat_id ${chat_id} completed`);

      for (const user of members) {
        if (user.handle != localUserHandle) {
          await localDatabase.insertChatAndUsers(chat_id, user.handle);
          await localDatabase.insertUsers(user.handle);
        }

        console.log(
          `Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat_id} completed`
        );
      }

      if (messages == null) {
        console.log("Messaggi nel gruppo vuoti");
      } else {
        for (const message of messages) {
          await localDatabase.insertMessage(
            message.message_id,
            chat_id,
            message.text,
            message.sender,
            message.date
          );
        }
      }
      eventEmitter.emit("newChat", { newChatId: chat_id });
      console.log("🟢 You joined group");
    });

    return "return of socket.io receiver function";
  },

  UpdateLastWebSocketActionDateTime: async (date) => {
    await AsyncStorage.setItem("lastUpdateDateTime", date);
    console.log("lastUpdateDateTime: ", date);
  },
};

export default WebSocketMethods;
