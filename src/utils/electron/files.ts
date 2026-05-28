import { rpc } from "./rpc";

export const filesRpc = {
  openDialog: async (options?: any): Promise<any> => {
    if (!rpc) return null;
    try {
      const res = await rpc.request("openFileDialog", options || {});
      return res && res.success ? res.data : null;
    } catch (err) {
      console.error("RPC openFileDialog error:", err);
      return null;
    }
  },
  openFile: async (filePath: string): Promise<boolean> => {
    if (!rpc) return false;
    try {
      const res = await rpc.request("openFile", { filePath });
      return res && res.success;
    } catch (err) {
      console.error("RPC openFile error:", err);
      return false;
    }
  }
};
