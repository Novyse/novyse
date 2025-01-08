import LocalDatabase from "../utils/localDatabaseMethods";

const db = new LocalDatabase();

class WebSocketMethods {
  constructor() {
    this.localUserID = "";
    this.apiKey = "";
    this.webSocketAddress = "wss://api.messanger.bpup.israiken.it/ws";
    this.webSocketChannel = null;
  }

  async openWebSocketConnection(localUserID, apiKey) {
    this.localUserID = localUserID;
    this.apiKey = apiKey;
    const url = `${this.webSocketAddress}/${localUserID}/${apiKey}`;

    try {
      this.webSocketChannel = new WebSocket(url);

      this.webSocketChannel.onopen = async () => {
        console.log("Connessione aperta");

        await this.webSocketSenderMessage(
          `{"type":"init","apiKey":"${apiKey}"}`
        );

        await this.webSocketReceiver();
      };

      this.webSocketChannel.onerror = (e) => {
        console.log("WebSocket error:", e.message);
      };
    } catch (error) {
      console.error("WebSocket initialization error:", error);
    }
  }

  async webSocketSenderMessage(message) {
    if (
      this.webSocketChannel &&
      this.webSocketChannel.readyState === WebSocket.OPEN
    ) {
      try {
        this.webSocketChannel.send(message);
        console.log(`Messaggio inviato alla websocket: ${message}`);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      console.log("WebSocket not open for sending message.");
    }
  }

  async webSocketReceiver() {
    if (!this.webSocketChannel) {
      console.log("WebSocket not initialized");
      return;
    }

    this.webSocketChannel.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "init":
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

          case "send_message":
            if (data.send_message === "True") {
              console.log("Messaggio tornato indietro: true");
              console.log(data.hash);
            } else if (data.send_message === "False") {
              console.log("Messaggio tornato indietro: false");
            }
            break;

          case "receive_message":
            const { message_id, chat_id, text, sender, date } = data;
            // Removed AsyncStorage call
            console.log(`Nuovo messaggio ricevuto da ${sender}`);
            // Here you could emit an event or update state in a React component to notify about new messages
            break;

          default:
            console.log("Unknown message type");
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    return "return of web socket function";
  }
}

export default WebSocketMethods;
