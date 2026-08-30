import { io, Socket } from "socket.io-client";

import { auth } from "@/src/utils/backend-services/auth";

import eventEmitter from "@/src/utils/global/Events/EventEmitter";
import eventReceiver from "@/src/utils/backend-services/lib/event-receiver";
import eventSender from "@/src/utils/backend-services/lib/event-sender";
import useNetworkStore from "@/src/store/NetworkStore";

import { SOCKET_BASE_URL } from "@/app.config";
import Platform from "@/src/utils/device/type";

let socket: Socket | null = null;
let isConnecting = false;

let transportsMethods = ["polling"];
if (Platform === "web" || Platform === "desktop") {
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

      const accessToken = await auth.token.get();

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

      socket.on("connect_error", async (error: any) => {
        console.error("Socket.IO connect_error:", error);

        // Use structured error codes from the server
        const errorCode = error?.data?.code;

        if (
          errorCode === "AUTH_NO_TOKEN" ||
          errorCode === "AUTH_INVALID_TOKEN" ||
          errorCode === "AUTH_TOKEN_EXPIRED"
        ) {
          console.warn(
            `Socket authentication error (${errorCode}), reconnecting with fresh token...`,
          );
          if (socket) {
            socket.disconnect();
            socket = null;
          }
          isConnecting = false;
          setTimeout(() => {
            SocketIO.open();
          }, 1000);
        }
      });

      // Handle token expiry notification from server
      socket.on("auth:expired", () => {
        console.warn(
          "Server notified token expired, reconnecting with fresh token...",
        );
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        isConnecting = false;
        setTimeout(() => {
          SocketIO.open();
        }, 500);
      });

      // Handle session revocation from server
      socket.on("auth:session-revoked", () => {
        console.warn(
          "Session has been revoked by the server, emitting invalidSession...",
        );
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        isConnecting = false;
        useNetworkStore.getState().setSocketConnected(false);
        // Trigger the invalid session flow (logout)
        eventEmitter.getEmitter().emit("invalidSession");
      });

      // Handle successful token refresh confirmation
      socket.on("auth:refreshed", (data: { expiresAt: number }) => {
        console.info(
          `Socket token refreshed, new expiry: ${new Date(data.expiresAt * 1000).toISOString()}`,
        );
      });

      // Handle token refresh errors
      socket.on(
        "auth:refresh:error",
        (data: { code: string; message: string }) => {
          console.error(
            `Socket token refresh failed: ${data.code}`,
            data.message,
          );

          if (data.code === "AUTH_IDENTITY_MISMATCH") {
            // Identity mismatch is a critical error, full reconnect
            if (socket) {
              socket.disconnect();
              socket = null;
            }
            isConnecting = false;
            SocketIO.open();
          }
        },
      );

      socket.on("error", async (error: any) => {
        console.error("Socket.IO connection error:", error);
        isConnecting = false;
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

// In-band token refresh: when @novyse/auth refreshes the token,
// send the new token over the existing WebSocket instead of reconnecting
auth.token.onUpdate((newToken: string | null) => {
  if (newToken && socket && socket.connected) {
    console.info("Token updated, sending auth:refresh over existing socket");
    socket.emit("auth:refresh", { token: newToken });
  }
});

// Fallback: if the socket is not connected when a token update happens,
// the next SocketIO.open() will use the fresh token from auth.token.get()

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
`