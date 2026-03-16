import { SQLiteDatabase } from "expo-sqlite";

export class HandleRepository {
  db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  get = {
    by: {
      uuid: async (type: "user" | "chat" | "bot", uuid: any): Promise<any> => {
        try {
          const result = await this.db.getFirstAsync(
            `SELECT * FROM handle WHERE ${type}UUID = ?`,
            [uuid],
          );
          return result ? result.handle : null;
        } catch (error) {
          console.error(`Error fetching handle by ${type}UUID:`, error);
          return null;
        }
      },
    },
  };
}
