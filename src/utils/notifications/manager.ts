import { AppState } from "react-native";
import mobile from "./lib/mobile";
import web from "./lib/web";
import firebase from "./lib/firebase";
import { useActiveChatStore } from "../../context/ActiveChatContext";

import Platform from "@/src/utils/device/type";

class NotificationManager {
  constructor() {
    this.init();
  }

  async init() {
    if (Platform === "mobile") {
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
      // Notification prompting can only be done from a user gesture on web.
      // We skip automatic request here to avoid the browser error.
      console.log(
        "[NotificationManager] Web init: skipping automatic permission request.",
      );
    }
  }

  async requestPermissions() {
    if (Platform === "web") {
      await web.requestPermissions();
    }
  }

  async updatePushToken() {
    if (Platform === "mobile") {
      await firebase.updateToken();
    }
  }

  /**
   * Processes an incoming FCM message (foreground)
   */
  private async handleRemoteMessage(remoteMessage: any) {
    if (Platform === "mobile") {
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
    switch (Platform) {
      case "web":
        web.send(title, body, data, icon);
        break;
      case "mobile":
        // Local display via Notifee
        await mobile.displayMessage({
          data: {
            ...data,
            content: body,
            chatName: title,
            chatIcon: icon,
          },
        });
        break;
      case "desktop":
        break;
    }
  }

  async sendNotificationWhenInBackground(
    title?: string,
    body?: string,
    data = {},
    icon?: string,
    subtitle?: string,
  ) {
    switch (Platform) {
      case "web":
        web.sendWhenHidden(title, body, data, icon);
        break;
      case "mobile":
        if (
          AppState.currentState === "background" ||
          AppState.currentState === "inactive"
        ) {
          await this.sendNotification(title, body, data, icon, subtitle);
        }
        break;
      case "desktop":
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
