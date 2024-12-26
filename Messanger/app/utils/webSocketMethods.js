import React, { createContext, useState, useEffect, useRef } from "react";
import { WebSocket } from "react-native-websocket";
import { JsonParser } from "./JsonParse"; // Implement JsonParser similar to the Dart one
import { LocalDatabaseMethods } from "./localDatabaseMethods"; // Replace with your implementation

const WebSocketContext = createContext(null);

class WebSocketProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      webSocket: null,
      localUserID: "",
      apiKey: "",
    };
    this.webSocketAddress = "wss://api.messanger.bpup.israiken.it/ws";
  }

  openWebSocketConnection = (_localUserID, _apiKey) => {
    this.setState({ localUserID: _localUserID, apiKey: _apiKey });

    const ws = new WebSocket(
      `<span class="math-inline">\{this\.webSocketAddress\}/</span>{_localUserID}/${_apiKey}`
    );

    ws.onopen = () => {
      console.log("WebSocket connection opened");
      this.setState({ webSocket: ws });
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      this.setState({ webSocket: null });
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
    };
  };

  WebSocketSenderMessage = (message) => {
    if (this.state.webSocket) {
      this.state.webSocket.send(message);
      console.log("Message sent via WebSocket:", message);
    }
  };

  // Use useRef to avoid unnecessary re-renders
  messageHandlerRef = useRef(null);

  componentDidMount() {
    this.messageHandlerRef.current = async (event) => {
      const data = event.data;
      const parsedData = JsonParser.convertJsonToDynamicStructure(data);
      const type = parsedData.type;

      switch (type) {
        case "init": {
          const init = parsedData.init;
          if (init === "True") {
            console.log(data);

            const localUserMap = parsedData.localUser;
            const { email, handle, name, surname } = localUserMap;

            await LocalDatabaseMethods.updateLocalUser(
              email,
              handle,
              name,
              surname
            );

            const chats = parsedData.chats;
            for (const chat of chats) {
              const chatMap = { ...chat, name: chat.name || "" };
              await LocalDatabaseMethods.insertChat(
                chatMap.chat_id,
                chatMap.name
              );

              for (const user of chatMap.users) {
                const userMap = { ...user };
                await LocalDatabaseMethods.insertUsers(userMap.handle);
                await LocalDatabaseMethods.insertChatAndUsers(
                  chatMap.chat_id,
                  userMap.handle
                );
              }

              for (const message of chatMap.messages) {
                const messageMap = { ...message };
                await LocalDatabaseMethods.insertMessage(
                  messageMap.message_id,
                  messageMap.chat_id,
                  messageMap.text,
                  messageMap.sender,
                  messageMap.date,
                  ""
                );
              }
            }
          } else {
            console.error("Server error during init");
          }
          break;
        }

        case "send_message": {
          const sendMessage = parsedData.send_message;
          if (sendMessage === "True") {
            console.log("Message echoed back: true");
            console.log(parsedData.hash);
          } else {
            console.log("Message echoed back: false");
          }
          break;
        }

        case "receive_message": {
          const { message_id, chat_id, text, sender, date } = parsedData;
          await LocalDatabaseMethods.insertMessage(
            message_id,
            chat_id,
            text,
            sender,
            date,
            ""
          );

          const newMessage = { sender, text, date_time: date };

          console.log("New message received:", newMessage);
          break;
        }

        default:
          console.warn("Unhandled message type:", type);
      }
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.webSocket !== this.state.webSocket) {
      if (this.state.webSocket) {
        this.state.webSocket.onmessage = this.messageHandlerRef.current;
      }
      return () => {
        if (this.state.webSocket) {
          this.state.webSocket.close();
        }
      };
    }
  }

  componentWillUnmount() {
    if (this.state.webSocket) {
      this.state.webSocket.close();
    }
  }

  render() {
    return (
      <WebSocketContext.Provider
        value={{
          openWebSocketConnection: this.openWebSocketConnection,
          WebSocketSenderMessage: this.WebSocketSenderMessage,
        }}
      >
        {this.props.children}
      </WebSocketContext.Provider>
    );
  }
}

export default WebSocketProvider;
export { WebSocketContext };
