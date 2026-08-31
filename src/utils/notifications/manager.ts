import { AppState } from "react-native";

import mobile from "./lib/mobile";
import firebase from "./lib/firebase";
import web from "./lib/web";
import desktop from "./lib/desktop";

import { getProfilePictureUri } from "@/src/utils/avatar/profilePicture";
import Platform from "@/src/utils/device/type";

// Lazily require to avoid a require cycle:
function getActiveChatStore() {
  return require("@/src/store/ActiveChatStore").useActiveChatStore;
}

class NotificationManager {
  constructor() {
    this.registerBackgroundHandler();
    this.init();
  }

  registerBackgroundHandler() {
    if (Platform === "mobile") {
      try {
        firebase.setBackgroundHandler(async (remoteMessage) => {
          console.log(
            "[NotificationManager] FCM Message received in background:",
            remoteMessage,
          );
          await mobile.displayMessage(remoteMessage);
        });
        console.log(
          "[NotificationManager] Background message handler registered synchronously.",
        );
      } catch (e) {
        console.error(
          "[NotificationManager] Failed to register background handler:",
          e,
        );
      }
    }
  }

  async init() {
    switch (Platform) {
      case "mobile":
        // Initialize Firebase (token, foreground listener)
        await firebase.init((remoteMessage) => {
          this.handleRemoteMessage(remoteMessage);
        });
        break;
      case "desktop":
        // Register Electron notification click handler on desktop
        if (typeof window !== "undefined" && (window as any).electron) {
          (window as any).electron.onNotificationClick((data: any) => {
            console.log(
              "[NotificationManager] Desktop notification clicked with data:",
              data,
            );
            if (data && data.chatUUID) {
              getActiveChatStore()
                .getState()
                .setSelectedChatUUID(data.chatUUID);
            }
          });
        }
        break;
    }
  }

  async requestPermissions() {
    switch (Platform) {
      case "web":
        await web.requestPermissions();
        break;
    }
  }

  async updatePushToken() {
    switch (Platform) {
      case "mobile":
        await firebase.updateToken();
        break;
    }
  }

  /**
   * Processes an incoming FCM message (foreground)
   */
  private async handleRemoteMessage(remoteMessage: any) {
    switch (Platform) {
      case "mobile":
        // Skip FCM notification if we are in foreground and Socket.io is connected.
        try {
          const SocketIO = (await import("../backend-services/socket-io"))
            .default;
          if (AppState.currentState === "active" && SocketIO.isOpen()) {
            console.log(
              "[NotificationManager] Skipping FCM message in foreground because Socket.IO is connected.",
            );
            return;
          }
        } catch (e) {
          console.error(
            "[NotificationManager] Error importing or checking SocketIO:",
            e,
          );
        }

        // Skip notification if we are already viewing the chat IN FOREGROUND
        const activeChatUUID =
          getActiveChatStore().getState().selectedChatUUID;
        const incomingChatUUID = remoteMessage.data?.chatUUID;

        if (
          AppState.currentState === "active" &&
          activeChatUUID &&
          incomingChatUUID === activeChatUUID
        ) {
          console.log(
            `[NotificationManager] Skipping notification for open chat: ${incomingChatUUID}`,
          );
          return;
        }

        await mobile.displayMessage(remoteMessage);
        break;
    }
  }

  /**
   * Send a notification across all platforms.
   */
  async sendNotification(
    title: string,
    body: string,
    data: any = {},
    profilePictureUUID?: string,
    subtitle?: string,
  ) {
    const isSystemSender =
      typeof data?.senderUUID === "string" &&
      data.senderUUID.replace(/-/g, "").startsWith("000000");

    const finalTitle = isSystemSender && !subtitle ? "" : title;
    const finalSubtitle = isSystemSender ? "" : subtitle;

    const icon =
      Platform !== "desktop"
        ? (await getProfilePictureUri(profilePictureUUID)) || undefined
        : undefined;

    switch (Platform) {
      case "web":
        web.send(finalTitle, body, data, icon, finalSubtitle);
        break;
      case "desktop":
        desktop.send(finalTitle, body, data, profilePictureUUID, finalSubtitle);
        break;
      case "mobile":
        // Local display via Notifee
        await mobile.displayMessage({
          data: {
            ...data,
            content: body,
            chatName: finalTitle,
            chatIcon: icon,
          },
        });
        break;
    }
  }

  async sendCallNotification(callData: any) {
    switch (Platform) {
      case "web":
        return;
      //web.sendCallNotification(callData);
      case "mobile":
        await mobile.displayCallNotification(callData);
        break;
      case "desktop":
        break;
    }
  }
}

const notificationManager = new NotificationManager();
export default notificationManager;
