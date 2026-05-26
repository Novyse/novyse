import { rpc } from "./rpc";

export const systemRpc = {
  getOpenOnStartup: async (): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const response = await rpc.request("system:get-open-on-startup");
      return response && response.success ? response.openAtLogin : false;
    } catch (error) {
      console.error("RPC Error getOpenOnStartup:", error);
      return false;
    }
  },

  setOpenOnStartup: async (openAtLogin: boolean): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const response = await rpc.request("system:set-open-on-startup", { openAtLogin });
      return response && response.success;
    } catch (error) {
      console.error("RPC Error setOpenOnStartup:", error);
      return false;
    }
  }
};
