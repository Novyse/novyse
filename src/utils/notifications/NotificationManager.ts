import { Platform, AppState } from "react-native";

// Conditionally require expo-notifications to avoid web SSR crash (localStorage)
let Notifications: any;
if (Platform.OS !== "web") {
  Notifications = require("expo-notifications");
}
class NotificationManager {
  constructor() {
    this.init();
  }

  async init() {
    if (Platform.OS !== "web") {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#4f8cff",
        });
      }

      await this.requestPermissionsMobile();
    } else {
      await this.requestPermissionsWeb();
    }
  }

  async requestPermissionsMobile() {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Permessi per le notifiche mobile non concessi");
    }
  }

  async requestPermissionsWeb() {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (
        Notification.permission !== "granted" &&
        Notification.permission !== "denied"
      ) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("Permessi per le notifiche web non concessi");
        }
      }
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
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        this._sendWebNotification(title, body, data, icon);
      }
    } else {
      if (
        AppState.currentState === "background" ||
        AppState.currentState === "inactive"
      ) {
        await this._sendMobileNotification(title, body, data, subtitle);
      }
    }
  }

  async sendNotification(
    title?: string,
    body?: string,
    data = {},
    icon?: string,
    subtitle?: string,
  ) {
    if (Platform.OS === "web") {
      this._sendWebNotification(title, body, data, icon);
    } else {
      await this._sendMobileNotification(title, body, data, subtitle);
    }
  }

  _sendWebNotification(
    title?: string,
    body?: string,
    data?: any,
    icon?: string,
  ) {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const notificationTitle = title || "Novyse";
      const notificationBody = body || "";

      const notification = new Notification(notificationTitle, {
        body: notificationBody,
        data,
        icon,
      });

      notification.onclick = function (event) {
        event.preventDefault();
        window.focus();
        notification.close();
      };
    }
  }

  async _sendMobileNotification(title, body, data, subtitle?: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        subtitle,
        color: "#4f8cff",
        sound: true,
      },
      trigger: null,
    });
  }
}

const notificationManager = new NotificationManager();
export default notificationManager;
