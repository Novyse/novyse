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

  send(
    title: string,
    body: string,
    data?: any,
    icon?: string,
    subtitle?: string,
  ) {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const notificationBody = subtitle ? `${subtitle}\n${body}` : body;

      const notification = new Notification(title, {
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
}

const webNotificationManager = new WebNotificationManager();
export default webNotificationManager;
