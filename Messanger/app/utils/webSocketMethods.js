import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "./EventEmitter";
import { Platform } from "react-native";

let webSocketChannel = null;
let localUserID = "";
let apiKey = "";
const webSocketAddress = "wss://api.messanger.bpup.israiken.it/ws";
let sendMessageAttempt = 0;

// Background task to keep websocket open
const BACKGROUND_WEBSOCKET_TASK = "background-websocket-task";
const BACKGROUND_FETCH_TASK_NAME = "websocket-keep-alive-fetch-task"; // Nome per BackgroundFetch task (unused in this corrected version, kept for clarity)

TaskManager.defineTask(BACKGROUND_WEBSOCKET_TASK, async () => {
  console.log("Websocketmethods - Background Task Executing...");
  try {
    // 1. Verifica lo stato della connessione WebSocket
    if (!WebSocketMethods.isWebSocketOpen()) {
      console.log("Websocket chiusa o non esistente nel task di background, riapro...");
      await WebSocketMethods.openWebSocketConnection(); // Riapri la connessione
    } else {
      console.log("Websocket sembra aperta nel task di background, invio heartbeat...");
      WebSocketMethods.sendHeartbeat(); // Invia messaggio heartbeat
    }
    return BackgroundFetch.Result.NewData; // Indica that task did something (websocket maintenance)
  } catch (error) {
    console.error("Errore nel task di background WebSocket:", error);
    return BackgroundFetch.Result.Failed; // Indicate task failure
  }
});


const WebSocketMethods = {
  saveParameters: async (localUserIDParam, apiKeyParam) => {
    localUserID = localUserIDParam;
    apiKey = apiKeyParam;
    console.log("Parametri salvati");
  },

  isWebSocketOpen: () => {
    return webSocketChannel && webSocketChannel.readyState === WebSocket.OPEN;
  },

  sendHeartbeat: () => {
    if (WebSocketMethods.isWebSocketOpen()) {
      const heartbeatMessage = JSON.stringify({ type: "heartbeat", timestamp: Date.now() });
      WebSocketMethods.webSocketSenderMessage(heartbeatMessage);
      console.log("Heartbeat WebSocket inviato.");
    } else {
      console.log("Websocket non aperta, heartbeat non inviato.");
    }
  },


  openWebSocketConnection: async () => {
    const url = `${webSocketAddress}/${localUserID}/${apiKey}`;

    try {
      try {
        if (
          webSocketChannel &&
          webSocketChannel.readyState === WebSocket.OPEN
        ) {
          console.log("Una websocket era già aperta");
          return; // Don't need to do anything if already open
        } else if (webSocketChannel) {
          webSocketChannel.close(); // Close existing websocket if not open but exists
          webSocketChannel = null;  // Force new websocket creation
        }
      } catch (error) {
        console.error("Error closing existing WebSocket:", error);
      }

      webSocketChannel = new WebSocket(url);

      webSocketChannel.onopen = async () => {
        console.log("Connessione websocket aperta");
        await WebSocketMethods.webSocketReceiver();
        eventEmitter.emit("webSocketOpen");
        console.log("Avvio Background Task WebSocket after connection open");
        WebSocketMethods.startWebSocketBackgroundTask(); // Start background task WHEN connection opens
      };

      webSocketChannel.onerror = (e) => {
        console.log("WebSocket error:", e.message);
      };

      webSocketChannel.onclose = async () => {
        console.log("Connessione websocket chiusa");
        console.log("Riavvio Background Task WebSocket after connection close (for periodic reconnect attempts)");
        WebSocketMethods.startWebSocketBackgroundTask(); // Restart background task on close too (keep-alive attempt)
      };

    } catch (error) {
      console.error("WebSocket initialization error:", error);
    }
  },

  webSocketSenderMessage: async (message) => {
    if (WebSocketMethods.isWebSocketOpen()) {
      try {
        webSocketChannel.send(message);
        console.log(`Messaggio inviato alla websocket: ${message}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      if (sendMessageAttempt < 5) {
        setTimeout(async () => {
          console.log("WebSocket non aperta per l'invio, ritento...");
          await WebSocketMethods.openWebSocketConnection();
          await WebSocketMethods.webSocketSenderMessage(message);
          sendMessageAttempt += 1;
        }, 2000);
      } else {
        console.error("WebSocket non aperta per l'invio, massimo tentativi raggiunti.");
      }
    }
  },

  webSocketReceiver: async () => {
    if (!webSocketChannel) {
      console.log("WebSocket non inizializzata (webSocketReceiver)");
      return;
    }

    webSocketChannel.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "init": {
            if (data.init === "True") {
              console.log("Init Successo WebSocket:", data);
              const { email, handle, name, surname } = data.localUser;
              await localDatabase.updateLocalUser(email, handle, name, surname);

              for (const chat of data.chats) {
                const chatName = chat.name || "";
                await localDatabase.insertChat(chat.chat_id, chatName);

                for (const user of chat.users) {
                  localDatabase.insertUsers(user.handle);
                  localDatabase.insertChatAndUsers(chat.chat_id, user.handle);
                }

                for (const message of chat.messages) {
                  await localDatabase.insertMessage(
                    message.message_id,
                    message.chat_id,
                    message.text,
                    message.sender.toString(),
                    message.date,
                    ""
                  );
                }
              }
              eventEmitter.emit("loginToChatList");
              console.log("Websocket Init completato con successo");
            } else if (data.init === "False") {
              console.log("Server error during websocket init");
            }
            break;
          }

          case "send_message": {
            if (data.send_message === "True") {
              console.log("Messaggio tornato indietro (send_message: true):", data);
              localDatabase.updateSendMessage(
                data.date,
                data.message_id,
                data.hash
              );
            } else if (data.send_message === "False") {
              console.log("Messaggio tornato indietro (send_message: false):", data);
            }
            break;
          }

          case "receive_message": {
            const { message_id, chat_id, text, sender, date } = data;
            localDatabase.insertMessage(
              message_id,
              chat_id,
              text,
              sender,
              date,
              ""
            );
            eventEmitter.emit("newMessage", data);
            eventEmitter.emit("updateNewLastMessage", data);
            console.log(`Nuovo messaggio ricevuto da ${sender}`);
            break;
          }

          default:
            console.log("Tipo di messaggio websocket sconosciuto:", data.type);
        }
      } catch (error) {
        console.error("Errore nell'elaborazione del messaggio websocket:", error);
      }
    };
    return "return of web socket receiver function"; // Example return
  },


  startWebSocketBackgroundTask: async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_WEBSOCKET_TASK);
      if (isRegistered) {
        console.log("Task WebSocket di background è già registrato.");
        // Removed incorrect BackgroundFetch.isTaskRunningAsync call
        return;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_WEBSOCKET_TASK, {
        minimumInterval: 60 * 1, // 15 minutes (adjust as needed)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log("Task WebSocket di background registrato e schedulato con BackgroundFetch.");
      await BackgroundFetch.setMinimumIntervalAsync(60 * 1); // Ensure interval is set (optional but good practice)


    } catch (error) {
      console.error("Errore nell'avvio/registrazione del task WebSocket di background:", error);
    }
  },

  stopWebSocketBackgroundTask: async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_WEBSOCKET_TASK);
      if (isRegistered) {
        await TaskManager.unregisterTaskAsync(BACKGROUND_WEBSOCKET_TASK);
        console.log("Task WebSocket di background deregistrato e fermato.");
      } else {
        console.log("Task WebSocket di background non era registrato.");
      }
    } catch (error) {
      console.error("Errore nella fermata del task WebSocket di background:", error);
    }
  },
};

export default WebSocketMethods;