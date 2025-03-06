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
// let heartbeatInterval = null; // Variable to hold the heartbeat interval timer

// // Background task to keep websocket open
// const BACKGROUND_WEBSOCKET_TASK = "background-websocket-task";
// const BACKGROUND_FETCH_TASK_NAME = "websocket-keep-alive-fetch-task"; // Nome per BackgroundFetch task (unused in this corrected version, kept for clarity)

// TaskManager.defineTask(BACKGROUND_WEBSOCKET_TASK, async () => {
//   console.log("Websocketmethods - Background Task Executing...");
//   try {
//     // 1. Verifica lo stato della connessione WebSocket
//     if (!WebSocketMethods.isWebSocketOpen()) {
//       console.log("Websocket chiusa o non esistente nel task di background, riapro...");
//       await WebSocketMethods.openWebSocketConnection(); // Riapri la connessione
//     } else {
//       console.log("Websocket sembra aperta nel task di background, invio heartbeat...");
//       WebSocketMethods.sendHeartbeat(); // Invia messaggio heartbeat
//     }
//     return BackgroundFetch.Result.NewData; // Indica that task did something (websocket maintenance)
//   } catch (error) {
//     console.error("Errore nel task di background WebSocket:", error);
//     return BackgroundFetch.Result.Failed; // Indicate task failure
//   }
// });


const WebSocketMethods = {
  saveParameters: async (localUserIDParam, apiKeyParam) => {
    localUserID = localUserIDParam;
    apiKey = apiKeyParam;
    console.log("Parametri salvati");
  },

  isWebSocketOpen: () => {
    return webSocketChannel && webSocketChannel.readyState === WebSocket.OPEN;
  },

  // sendHeartbeat: () => {
  //   if (WebSocketMethods.isWebSocketOpen()) {
  //     const heartbeatMessage = JSON.stringify({ type: "heartbeat", timestamp: Date.now() });
  //     WebSocketMethods.webSocketSenderMessage(heartbeatMessage);
  //     console.log("Heartbeat WebSocket inviato.");
  //   } else {
  //     console.log("Websocket non aperta, heartbeat non inviato.");
  //   }
  // },


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
        // console.log("Avvio Background Task WebSocket after connection open");
        // WebSocketMethods.startWebSocketBackgroundTask(); // Start background task WHEN connection opens

        // Set up heartbeat interval on connection open
        // if (!heartbeatInterval) {
        //   heartbeatInterval = setInterval(WebSocketMethods.sendHeartbeat, 30000); // Send heartbeat every 30 seconds (adjust as needed)
        //   console.log("Heartbeat interval timer started.");
        // }


      };

      webSocketChannel.onerror = (e) => {
        console.log("WebSocket error:", e.message);
        // clearInterval(heartbeatInterval); // Clear heartbeat on error
        // heartbeatInterval = null;
      };

      webSocketChannel.onclose = async () => {
        console.log("Connessione websocket chiusa");
        // clearInterval(heartbeatInterval); // Clear heartbeat on close
        // heartbeatInterval = null;
        // console.log("Riavvio Background Task WebSocket after connection close (for periodic reconnect attempts)");
        // WebSocketMethods.startWebSocketBackgroundTask(); // Restart background task on close too (keep-alive attempt)
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
        console.log("WebSocket onmessage event:", event); // Log the raw event
        const data = JSON.parse(event.data);
        console.log("WebSocket onmessage data:", data); // Log parsed data

        switch (data.type) {
          case "init": {
            if (data.init === "True") {
              console.log("Init Successo WebSocket:", data);
              const { email, handle, name, surname } = data.localUser;
              await localDatabase.updateLocalUser(email, handle, name, surname);
              console.log("Database updateLocalUser completed"); // Log DB operation start and end

              if (data.chats == null) {
                //invia un evento a loginpassword per effettuare il login
                eventEmitter.emit("loginToChatList");
                console.log("Chat nell'init vuote, init completat con successo");
                return;
              }

              for (const chat of data.chats) {
                const chatName = chat.name || "";
                await localDatabase.insertChat(chat.chat_id, chatName);
                console.log(`Database insertChat for chat_id ${chat.chat_id} completed`);

                for (const user of chat.users) {
                  localDatabase.insertUsers(user.handle);
                  localDatabase.insertChatAndUsers(chat.chat_id, user.handle);
                  console.log(`Database insertUsers and insertChatAndUsers for user ${user.handle} in chat ${chat.chat_id} completed`);
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
                  //console.log(`Database insertMessage for message_id ${message.message_id} in chat ${chat.chat_id} completed`);
                }
              }

              //invia un evento a loginpassword per effettuare il login
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
              console.log(`Database updateSendMessage for message_id ${data.message_id} completed`);
            } else if (data.send_message === "False") {
              console.log("Messaggio tornato indietro (send_message: false):", data);
            }
            break;
          }

          case "receive_message": {
            const { message_id, chat_id, text, sender, date } = data;
            await localDatabase.insertMessage(
              message_id,
              chat_id,
              text,
              sender,
              date,
              ""
            );
            console.log(`Database insertMessage for message_id ${message_id} in chat ${chat_id} completed`);
            eventEmitter.emit("newMessage", data);
            console.log("EventEmitter emit newMessage completed");
            eventEmitter.emit("updateNewLastMessage", data);
            console.log("EventEmitter emit updateNewLastMessage completed");
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
        minimumInterval: 60 * 1, // 1 minutes (adjust as needed for testing, use higher value in prod)
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