import { rpc } from "./rpc";

export const notificationsRpc = {
  show: async (title: string, body: string, data?: any, icon?: string, subtitle?: string): Promise<boolean> => {
    if (!rpc) return false;
    try {
      await rpc.request("showNotification", { title, body, subtitle, data, icon });
      return true;
    } catch (err) {
      console.error("RPC showNotification error:", err);
      return false;
    }
  }
};
