import { databaseRpc } from "@/src/utils/electron/database";

export default class DesktopSQLiteAdapter {
  async execAsync(source: string): Promise<void> {
    await databaseRpc.execute("exec", source);
  }

  async runAsync(
    source: string,
    ...args: any[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const res = await databaseRpc.execute("run", source, args);
    return res.data;
  }

  async getAllAsync<T>(source: string, ...args: any[]): Promise<T[]> {
    const res = await databaseRpc.execute("all", source, args);
    return res.data as T[];
  }

  async getFirstAsync<T>(source: string, ...args: any[]): Promise<T | null> {
    const res = await databaseRpc.execute("get", source, args);
    return res.data ? res.data : null;
  }
}
