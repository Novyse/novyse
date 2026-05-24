import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";

export class HandleRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;

  constructor(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  get = {
    by: {
      uuid: async (type: "user" | "chat" | "bot", uuid: any): Promise<any> => {
        try {
          const result: { handle: string } | null = await this.db.getFirstAsync(
            `SELECT handle FROM handle WHERE ${type}UUID = ?`,
            [uuid],
          );
          return result?.handle || null;
        } catch (error) {
          console.error(`Error fetching handle by ${type}UUID:`, error);
          return null;
        }
      },
    },
  };
}
