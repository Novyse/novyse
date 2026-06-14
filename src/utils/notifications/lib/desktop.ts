import { notificationsRpc } from "@/src/utils/electron/notifications";

class DesktopNotificationManager {
  send(
    title: string,
    body: string,
    data?: any,
    icon?: string,
    subtitle?: string,
  ) {
    notificationsRpc.show(title, body, data, icon, subtitle);
  }
}

const desktopNotificationManager = new DesktopNotificationManager();
export default desktopNotificationManager;
