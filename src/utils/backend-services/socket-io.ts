import { io, Socket } from "socket.io-client";

import { getAuthToken } from "./auth/token-manager";

import eventEmitter from "../global/Events/EventEmitter";
import eventReceiver from "./lib/event-receiver";
import eventSender from "./lib/event-sender";
import useNetworkStore from "@/src/context/NetworkContext";

import { SOCKET_BASE_URL } from "../../../app.config";
import { Platform } from "react-native";

let socket: Socket | null = null;
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
      const { isSynced, isConnected } = useNetworkStore.getState();
      if (!isConnected || !isSynced) {
        console.warn("Cannot open socket: Network offline or not synced");
        return;
      }

      if (isConnecting || SocketIO.isOpen()) {
        console.warn(
          "Socket.IO connection already in progress or already connected",
        );
        return socket;
      }

      isConnecting = true;

      const accessToken = await getAuthToken();

      socket = io(SOCKET_BASE_URL, {
        path: "/socket.io",
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
        useNetworkStore.getState().setSocketConnected(true);
        await eventReceiver.initialize(socket);
        await eventSender.initialize(socket);
      });

      socket.on("connect_error", async (error) => {
        console.error("Socket.IO connect_error:", error);
        // Handle authentication errors specifically
        if (
          error.message.includes("Authentication error") ||
          error.message.includes("jwt expired")
        ) {
          console.warn(
            "Socket authentication error, attempting to reconnection...",
          );
          if (socket) {
            socket.disconnect();
            socket = null;
          }
          setTimeout(() => {
            SocketIO.open();
          }, 1000);
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
        useNetworkStore.getState().setSocketConnected(false);
        console.info("Closed Socket.IO connection", { reason });
      });
    } catch (error) {
      console.error("Socket.IO initialization error:", error);
      isConnecting = false;
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
  close: () => {
    if (socket) {
      console.log("Closing Socket.IO connection due to state change");
      socket.disconnect();
      socket = null;
    }
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

// Subscribe to network store to auto connect/disconnect
useNetworkStore.subscribe((state) => {
  if (state.isConnected && state.isSynced) {
    if (!socket || !socket.connected) {
      console.log(
        "Network state changed to online and synced. Opening socket...",
      );
      SocketIO.open();
    }
  } else {
    if (socket) {
      console.log(
        "Network state changed to offline or unsynced. Closing socket...",
      );
      SocketIO.close();
    }
  }
});

export default SocketIO;
