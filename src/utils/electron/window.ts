import { rpc } from "./rpc";

export const windowRpc = {
  isMaximized: async (): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const res = await rpc.request("window:is-maximized");
      return res; // Assuming boolean is returned directly or inside a payload
    } catch (err) {
      console.error("RPC window:is-maximized error:", err);
      return false;
    }
  }
};
