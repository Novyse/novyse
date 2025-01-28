import localDatabase from "../utils/localDatabaseMethods";
import eventEmitter from "./EventEmitter";

let webSocketChannel = null;
let localUserID = "";
let apiKey = "";
const webSocketAddress = "wss://api.messanger.bpup.israiken.it/ws";
let sendMessageAttempt = 0;

const WebSocketMethods = {
  saveParameters: async (localUserIDParam, apiKeyParam) => {
    localUserID = localUserIDParam;
    apiKey = apiKeyParam;
    console.log("Parametri salvati");
  },

  openWebSocketConnection: async () => {
    const url = `${webSocketAddress}/${localUserID}/${apiKey}`;

    try {
      try {
        if (
          webSocketChannel &&
          webSocketChannel.readyState === WebSocket.OPEN
        ) {
          // webSocketChannel.close();
          console.log("Una websocket era già aperta");
        } else {
          webSocketChannel = new WebSocket(url);
        }
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }

      webSocketChannel.onopen = async () => {
        console.log("Connessione websocket aperta");
        await WebSocketMethods.webSocketReceiver();
        eventEmitter.emit("webSocketOpen");
      };

      webSocketChannel.onerror = (e) => {
        console.log("WebSocket error:", e.message);
      };

      webSocketChannel.onclose = async () => {
        console.log("Connessione websocket chiusa");
      };
    } catch (error) {
      console.error("WebSocket initialization error:", error);
    }
  },

  webSocketSenderMessage: async (message) => {
    if (webSocketChannel && webSocketChannel.readyState === WebSocket.OPEN) {
      try {
        webSocketChannel.send(message);
        console.log(`Messaggio inviato alla websocket: ${message}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      if (sendMessageAttempt < 5) {
        setTimeout(async () => {
          console.log("WebSocket not open for sending message, retrying");
          await WebSocketMethods.openWebSocketConnection();
          await WebSocketMethods.webSocketSenderMessage(message);
          sendMessageAttempt += 1;
        }, 2000);
      } else {
        console.error("WebSocket not open for sending message, max attempts");
      }
    }
  },

  webSocketReceiver: async () => {
    if (!webSocketChannel) {
      console.log("WebSocket not initialized");
      return;
    }

    webSocketChannel.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "init": {
            if (data.init === "True") {
              console.log(data);

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
              console.log("Init con successo");
            } else if (data.init === "False") {
              console.log("Server error during init");
            }
            break;
          }

          case "send_message": {
            if (data.send_message === "True") {
              console.log("Messaggio tornato indietro: true");
              console.log(data.hash);
              localDatabase.updateSendMessage(
                data.date,
                data.message_id,
                data.hash
              );
            } else if (data.send_message === "False") {
              console.log("Messaggio tornato indietro: false");
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
            console.log("Unknown message type");
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    return "return of web socket function";
  },
};

export default WebSocketMethods;
