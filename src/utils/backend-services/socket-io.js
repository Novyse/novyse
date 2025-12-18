import { io } from "socket.io-client";

import gateway from "./api-gateway.js";
import token from "../welcome/token.js";

import eventEmitter from "../global/Events/EventEmitter.js";
import eventReceiver from "./lib/event-receiver.js";
import eventSender from "./lib/event-sender.js";

import { BRANCH, SOCKET_BASE_URL } from "../../../app.config.js";
import { Platform } from "react-native";

let path;

switch (BRANCH) {
  case "development":
    path = "/development";
    break;
  case "preview":
    path = "/preview";
    break;
  default:
    path = "/production";
}

path += "/socket.io";

let socket = null;
let isConnecting = false;

let transportsMethods = ["polling"];
if (Platform.OS == "web") {
  transportsMethods.pop();
  transportsMethods.push("websocket");
}

const SocketIO = {
  isOpen: () => {
    return socket && socket.connected;
  },

  open: async () => {
    try {
      if (isConnecting || SocketIO.isOpen()) {
        console.warn(
          "Socket.IO connection already in progress or already connected"
        );
        return socket;
      }

      isConnecting = true;

      const accessToken = await token.getAccessToken();

      socket = io(SOCKET_BASE_URL, {
        path: path,
        transports: transportsMethods,
        autoConnect: true,
        reconnectionAttempts: -1,
        auth: {
          token: accessToken,
        },
      });

      socket.on("connect", async () => {
        console.info("Socket.IO connection opened!");
        isConnecting = false;
        await eventReceiver.initialize(socket);
        await eventSender.initialize(socket);
      });

      socket.on("connect_error", async (error) => {
        console.error("Socket.IO connect_error:", error);
        console.error("Error type:", error.type);
        console.error("Error code:", error.code);
        if (error && error.message) {
          console.error("Connect error message:", error.message);
          isConnecting = false;
        }
        if (error && error.data) {
          console.error("Connect error data:", error.data);
          isConnecting = false;
        }
        // Handle authentication errors specifically
        if (
          error.message.includes("Authentication error") ||
          error.message.includes("jwt expired")
        ) {
          await gateway.handleSocketAuthError();
        }
      });

      socket.on("error", async (error) => {
        console.error("Socket.IO connection error:", error);
        isConnecting = false;

        if (error.status === 401) {
          console.error("Invalid session - retrying pulling new sessionId");

          if (socket) {
            socket.disconnect();
            socket = null;
          }

          setTimeout(async () => {
            await SocketIO.open();
          }, 2000);
        }
      });

      socket.on("disconnect", (reason) => {
        isConnecting = false;
        console.info("Closed Socket.IO connection", { reason });
      });
    } catch (error) {
      console.error("Socket.IO initialization error:", error);
      isConnecting = false;
      if (error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }
  },

  send: () => {
    if (!socket || !socket.connected) {
      console.error("Cannot send message: Socket not connected");
      return;
    }
    return eventSender;
  },

  getSocket: () => {
    return socket;
  },
};

// Reconnect socket on app foreground

eventEmitter.getEmitter().on("socketReconnect", async () => {
  console.log("Reconnecting Socket.IO after token refresh");
  if (socket) {
    socket.disconnect(); // Disconnect first to avoid conflicts
  }
  await SocketIO.open();
});

export default SocketIO;