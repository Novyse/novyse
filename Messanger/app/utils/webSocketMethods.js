import LocalDatabase from "../utils/localDatabaseMethods";

let webSocketChannel = null;
let localUserID = "";
let apiKey = "";
const db = new LocalDatabase();
const webSocketAddress = "wss://api.messanger.bpup.israiken.it/ws";

const WebSocketMethods = {
  openWebSocketConnection: async (localUserIDParam, apiKeyParam) => {
    localUserID = localUserIDParam;
    apiKey = apiKeyParam;
    const url = `${webSocketAddress}/${localUserID}/${apiKey}`;

    try {
      webSocketChannel = new WebSocket(url);

      webSocketChannel.onopen = async () => {
        console.log("Connessione aperta");
        await WebSocketMethods.webSocketSenderMessage(
          `{"type":"init","apiKey":"${apiKey}"}`
        );
        await WebSocketMethods.webSocketReceiver();
      };

      webSocketChannel.onerror = (e) => {
        console.log("WebSocket error:", e.message);
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
      console.log("WebSocket not open for sending message.");
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
              await db.updateLocalUser(email, handle, name, surname);

              for (const chat of data.chats) {
                const chatName = chat.name || "";

                await db.insertChat(chat.chat_id, chatName);

                for (const user of chat.users) {
                  db.insertUsers(user.handle);
                  db.insertChatAndUsers(chat.chat_id, user.handle);
                }

                for (const message of chat.messages) {
                  await db.insertMessage(
                    message.message_id,
                    message.chat_id,
                    message.text,
                    message.sender.toString(),
                    message.date,
                    ""
                  );
                }
              }
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
              db.updateSendMessage(data.date, data.message_id, data.hash);
            } else if (data.send_message === "False") {
              console.log("Messaggio tornato indietro: false");
            }
            break;
          }

          case "receive_message": {
            const { message_id, chat_id, text, sender, date } = data;

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
