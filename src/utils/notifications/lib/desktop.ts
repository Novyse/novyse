class DesktopNotificationManager {
  send(
    title: string,
    body: string,
    data?: any,
    icon?: string,
    subtitle?: string,
  ) {
    if (typeof window !== "undefined" && (window as any).electron) {
      (window as any).electron.rpc
        .request("showNotification", {
          title,
          body,
          subtitle,
          data,
          icon,
        })
        .catch((err: any) => {
          console.error(
            "[DesktopNotificationManager] Error invoking showNotification RPC:",
            err,
          );
        });
    }
  }
}

const desktopNotificationManager = new DesktopNotificationManager();
export default desktopNotificationManager;
