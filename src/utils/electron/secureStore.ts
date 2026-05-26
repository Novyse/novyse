import { rpc } from "./rpc";

export const secureStoreRpc = {
  get: async (key: string): Promise<string | null> => {
    if (!rpc) return null;
    try {
      const res = await rpc.request("secureStoreGet", { key });
      return res && res.success ? res.value : null;
    } catch (err) {
      console.error("RPC secureStoreGet error:", err);
      return null;
    }
  },
  set: async (key: string, value: string): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const res = await rpc.request("secureStoreSet", { key, value });
      return res && res.success;
    } catch (err) {
      console.error("RPC secureStoreSet error:", err);
      return false;
    }
  },
  delete: async (key: string): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const res = await rpc.request("secureStoreDelete", { key });
      return res && res.success;
    } catch (err) {
      console.error("RPC secureStoreDelete error:", err);
      return false;
    }
  }
};
