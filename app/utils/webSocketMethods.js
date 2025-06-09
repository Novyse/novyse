import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "./EventEmitter";
import { io } from "socket.io-client";
import APIMethods from "./APImethods";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket = null;
let localUserHandle = null;

const WebSocketMethods = {
  isWebSocketOpen: () => {
    return socket && socket.connected;
  },

  openWebSocketConnection: async () => {
    const sessionId = await AsyncStorage.getItem("sessionIdToken");

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

      socket = io("wss://io.novyse.com", {
        path: "/test/io",
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
        if (error.data.status === 401) {
          eventEmitter.emit("invalidSession");
          console.log("Sessione scaduta");
        }
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

    // quello che ricevo dal server dopo che qualcuno ha joinato una vocal chat
    socket.on("member_joined_comms", async (data) => {
      console.log("🐬Qualcuno è entrato nella chat vocale");
      eventEmitter.emit("member_joined_comms", data);
    });

    // risposta del server quando qualcuno esce dalla chat
    socket.on("member_left_comms", async (data) => {
      console.log("🐬Qualcuno è uscito nella chat vocale");
      eventEmitter.emit("member_left_comms", data);
    });

    socket.on("candidate", async (data) => {
      eventEmitter.emit("candidate", data);
    });

    socket.on("answer", async (data) => {
      eventEmitter.emit("answer", data);
    });

    socket.on("offer", async (data) => {
      eventEmitter.emit("offer", data);
    });

    // Voice Activity Detection signaling
    socket.on("speaking", async (data) => {
      if (!data || !data.from) {
        console.error("Invalid speaking data received:", data);
        return;
      }
      // Emit event to match your component expectations
      eventEmitter.emit("remote_user_started_speaking", {
        id: data.from,
        chatId: data.to,
      });
    });

    socket.on("not_speaking", async (data) => {
      if (!data || !data.from) {
        console.error("Invalid not_speaking data received:", data);
        return;
      }
      // Emit event to match your component expectations
      eventEmitter.emit("remote_user_stopped_speaking", {
        id: data.from,
        chatId: data.to,
      });
    }); // Screen sharing signaling
    socket.on("screen_share_started", async (data) => {
      if (!data || !data.from || !data.screen_share_uuid) {
        console.error("Invalid screen_share_started data received:", data);
        return;
      }
      console.log(
        `[WebSocket] Screen share started - from: ${data.from}, streamId: ${data.screen_share_uuid}, chatId: ${data.to}`
      );

      // Emit event to notify components
      eventEmitter.emit("screen_share_started", {
        from: data.from,
        chatId: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });
    socket.on("screen_share_stopped", async (data) => {
      if (!data || !data.from || !data.screen_share_uuid) {
        console.error("Invalid screen_share_stopped data received:", data);
        return;
      }
      console.log(
        `[WebSocket] Screen share stopped - from: ${data.from}, streamId: ${data.screen_share_uuid}, chatId: ${data.to}`
      );

      // Emit event to notify components
      eventEmitter.emit("screen_share_stopped", {
        from: data.from,
        chatId: data.to,
        screenShareUUID: data.screen_share_uuid,
      });
    });

    return "return of socket.io receiver function";
  },
  // quando voglio entrare in una vocal chat
  IceCandidate: async (data) => {
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
      console.error("Error sending RTC offer", {
        error: error.message,
        data,
      });
      return false;
    }
  },
  // quando voglio entrare in una vocal chat
  RTCAnswer: async (data) => {
    if (!socket || !socket.connected) {
      console.error("Cannot send RTC answer: Socket not connected", {
        socketExists: !!socket,
        socketConnected: socket?.connected,
        data,
      });
      return false;
    }

    try {
      console.log("Sending RTC answer via WebSocket", {
        to: data.to,
        from: data.from,
        hasAnswer: !!data.answer,
      });

      socket.emit("answer", data);

      console.log("RTC answer sent successfully", {
        to: data.to,
        from: data.from,
      });

      return true;
    } catch (error) {
      console.error("Error sending RTC answer", {
        error: error.message,
        data,
      });
      return false;
    }
  },
  // Voice Activity Detection signaling methods
  sendSpeakingStatus: async (commsId, partecipantId, isSpeaking) => {
    if (!socket || !socket.connected) {
      console.log("Cannot send speaking status: Socket not connected");
      return;
    }

    const eventType = isSpeaking ? "speaking" : "not_speaking";
    const data = {
      to: commsId,
      from: partecipantId,
    };
    // Send to server
    socket.emit(eventType, data);
  }, // Screen sharing signaling methods
  sendScreenShareStarted: async (chatId, from, streamId) => {
    if (!socket || !socket.connected) {
      console.log("Cannot send screen share status: Socket not connected");
      return;
    }

    const data = {
      to: chatId,
      from: from,
      screen_share_uuid: streamId, // CRITICAL FIX: Use screen_share_uuid to match receiving end
      streamType: "screenshare",
    };

    console.log(
      `[WebSocket] Sending screen_share_started - from: ${from}, streamId: ${streamId}, chatId: ${chatId}`
    );
    socket.emit("screen_share_started", data);
  },
  sendScreenShareStopped: async (chatId, from, streamId) => {
    if (!socket || !socket.connected) {
      console.log("Cannot send screen share status: Socket not connected");
      return;
    }

    const data = {
      to: chatId,
      from: from,
      screen_share_uuid: streamId, // CRITICAL FIX: Use screen_share_uuid to match receiving end
      streamType: "screenshare",
    };

    console.log(
      `[WebSocket] Sending screen_share_stopped - from: ${from}, streamId: ${streamId}, chatId: ${chatId}`
    );
    socket.emit("screen_share_stopped", data);
  },

  UpdateLastWebSocketActionDateTime: async (date) => {
    await AsyncStorage.setItem("lastUpdateDateTime", date);
    console.log("lastUpdateDateTime: ", date);
  },
};

export default WebSocketMethods;
