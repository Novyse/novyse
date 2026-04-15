import { Platform } from "react-native";

class WebNotificationManager {
  async requestPermissions() {
    if (Platform.OS !== "web") return;

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

  send(title?: string, body?: string, data?: any, icon?: string) {
    if (Platform.OS !== "web") return;

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

  sendWhenHidden(title?: string, body?: string, data?: any, icon?: string) {
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      this.send(title, body, data, icon);
    }
  }
}

const webNotificationManager = new WebNotificationManager();
export default webNotificationManager;
