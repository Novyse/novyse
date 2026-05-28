import { rpc } from "./rpc";

export const databaseRpc = {
  execute: async (method: "exec" | "run" | "all" | "get", query: string, params: any[] = []): Promise<any> => {
    if (!rpc) throw new Error("RPC not available");
    const res = await rpc.request("executeDbQuery", { method, query, params });
    if (!res.success) throw new Error(res.error);
    return res;
  }
};
