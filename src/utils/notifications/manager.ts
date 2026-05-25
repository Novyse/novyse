import { AppState } from "react-native";

import mobile from "./lib/mobile";
import firebase from "./lib/firebase";
import web from "./lib/web";
import desktop from "./lib/desktop";

import { useActiveChatStore } from "../../context/ActiveChatContext";

import { getProfilePictureUri } from "@/src/utils/avatar/profilePicture";
import Platform from "@/src/utils/device/type";

class NotificationManager {
  constructor() {
    this.init();
  }

  async init() {
    switch (Platform) {
      case "mobile":
        // Initialize Firebase (token, foreground listener)
        await firebase.init((remoteMessage) => {
          this.handleRemoteMessage(remoteMessage);
        });

        // Background handler (must be called early)
        firebase.setBackgroundHandler(async (remoteMessage) => {
          console.log("FCM Message received in background:", remoteMessage);
          await mobile.displayMessage(remoteMessage);
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
              useActiveChatStore.getState().setSelectedChatUUID(data.chatUUID);
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
        break;
    }
  }

  /**
   * Send a notification across all platforms.
   */
  async sendNotification(
    title: string,
    body: string,
    data = {},
    profilePictureUUID?: string,
    subtitle?: string,
  ) {
    const icon = (await getProfilePictureUri(profilePictureUUID)) || undefined;
    switch (Platform) {
      case "web":
        web.send(title, body, data, icon, subtitle);
        break;
      case "desktop":
        desktop.send(title, body, data, icon, subtitle);
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
