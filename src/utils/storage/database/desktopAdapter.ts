import { rpc } from "@/src/utils/electron/rpc";

export default class DesktopSQLiteAdapter {
  async execAsync(source: string): Promise<void> {
    const res = await rpc.request("executeDbQuery", {
      method: "exec",
      query: source,
      params: [],
    });
    if (!res.success) throw new Error(res.error);
  }

  async runAsync(
    source: string,
    ...args: any[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const res = await rpc.request("executeDbQuery", {
      method: "run",
      query: source,
      params: args,
    });
    if (!res.success) throw new Error(res.error);
    return res.data;
  }

  async getAllAsync<T>(source: string, ...args: any[]): Promise<T[]> {
    const res = await rpc.request("executeDbQuery", {
      method: "all",
      query: source,
      params: args,
    });
    if (!res.success) throw new Error(res.error);
    return res.data as T[];
  }

  async getFirstAsync<T>(source: string, ...args: any[]): Promise<T | null> {
    const res = await rpc.request("executeDbQuery", {
      method: "get",
      query: source,
      params: args,
    });
    if (!res.success) throw new Error(res.error);
    return res.data ? res.data : null;
  }
}
