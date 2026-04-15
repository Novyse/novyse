import { Platform, AppState } from "react-native";
import mobile from "./lib/mobile";
import web from "./lib/web";
import firebase from "./lib/firebase";
import { useActiveChatStore } from "../../../context/ActiveChatContext";

class NotificationManager {
  constructor() {
    this.init();
  }

  async init() {
    if (Platform.OS !== "web") {
      // Initialize Firebase (token, foreground listener)
      await firebase.init((remoteMessage) => {
        this.handleRemoteMessage(remoteMessage);
      });

      // Background handler (must be called early)
      firebase.setBackgroundHandler(async (remoteMessage) => {
        console.log("FCM Message received in background:", remoteMessage);
        await mobile.displayMessage(remoteMessage);
      });
    } else {
      await web.requestPermissions();
    }
  }

  async updatePushToken() {
    if (Platform.OS === "web") return;
    await firebase.updateToken();
  }

  /**
   * Processes an incoming FCM message (foreground)
   */
  private async handleRemoteMessage(remoteMessage: any) {
    if (Platform.OS !== "web") {
      // Skip notification if we are already viewing the chat IN FOREGROUND
      const activeChatUUID = useActiveChatStore.getState().selectedChatUUID;
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
    }
  }

  /**
   * Legacy methods for internal app notifications (if still needed)
   */
  async sendNotification(
    title?: string,
    body?: string,
    data = {},
    icon?: string,
    subtitle?: string,
  ) {
    if (Platform.OS === "web") {
      web.send(title, body, data, icon);
    } else {
      // Local display via Notifee
      await mobile.displayMessage({
        data: {
          ...data,
          content: body,
          chatName: title,
          chatIcon: icon,
        },
      });
    }
  }

  async sendNotificationWhenInBackground(
    title?: string,
    body?: string,
    data = {},
    icon?: string,
    subtitle?: string,
  ) {
    if (Platform.OS === "web") {
      web.sendWhenHidden(title, body, data, icon);
    } else {
      if (
        AppState.currentState === "background" ||
        AppState.currentState === "inactive"
      ) {
        await this.sendNotification(title, body, data, icon, subtitle);
      }
    }
  }

  async sendCallNotification(callData: any) {
    if (Platform.OS === "web") {
      return;
      //web.sendCallNotification(callData);
    } else {
      await mobile.displayCallNotification(callData);
    }
  }
}

const notificationManager = new NotificationManager();
export default notificationManager;
