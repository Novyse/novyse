import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";

export class FileRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;

  constructor(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  get = {
    ref: async (fileUUID: any): Promise<any> => {
      try {
        const file: any = await this.db.getFirstAsync(
          `SELECT ref FROM file WHERE uuid = ?;`,
          [fileUUID],
        );
        return file ? file.ref : null;
      } catch (error) {
        console.error("Error retrieving file ref:", error);
        return null;
      }
    },

    all: async (fileUUID: any): Promise<any> => {
      try {
        const file: any = await this.db.getFirstAsync(
          `SELECT * FROM file WHERE uuid = ?;`,
          [fileUUID],
        );
        return file || null;
      } catch (error) {
        console.error("Error retrieving all file info:", error);
        return null;
      }
    },

    totalSize: async (): Promise<number> => {
      try {
        const result: any = await this.db.getFirstAsync(
          `SELECT SUM(size) as totalSize FROM file;`,
        );
        return result ? result.totalSize : 0;
      } catch (error) {
        console.error("Error calculating total file size:", error);
        return 0;
      }
    },
  };

  update = {
    ref: async (fileUUID: any, newRef: any): Promise<boolean> => {
      try {
        if (!fileUUID || !newRef) {
          console.error("Missing required fields to update file ref.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE file SET ref = ? WHERE uuid = ?;`,
          [newRef, fileUUID],
        );
        if (result.changes > 0) {
          console.log("File ref updated successfully:", fileUUID);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error updating file ref:", error);
        return false;
      }
    },

    waveform: async (fileUUID: any, newWaveform: any): Promise<boolean> => {
      try {
        if (!fileUUID || !newWaveform) {
          console.error("Missing required fields to update file waveform.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE file SET waveform = ? WHERE uuid = ?;`,
          [JSON.stringify(newWaveform), fileUUID],
        );
        return result.changes > 0;
      } catch (error) {
        console.error("Error updating file waveform:", error);
        return false;
      }
    },

    duration: async (fileUUID: any, newDuration: any): Promise<boolean> => {
      try {
        if (!fileUUID || newDuration === undefined || newDuration === null) {
          console.error("Missing required fields to update file duration.");
          return false;
        }
        const result: any = await this.db.runAsync(
          `UPDATE file SET duration = ? WHERE uuid = ?;`,
          [newDuration, fileUUID],
        );
        return result.changes > 0;
      } catch (error) {
        console.error("Error updating file duration:", error);
        return false;
      }
    },
  };

  add = async (
    uuid: any,
    name: any,
    mimeType: any,
    size: any,
  ): Promise<boolean> => {
    try {
      if (!uuid || !name || !mimeType || !size) {
        console.error("Missing required fields to add file.");
        return false;
      }
      await this.db.runAsync(
        `INSERT OR IGNORE INTO file (uuid, name, mimeType, size) VALUES (?, ?, ?, ?);`,
        [uuid, name, mimeType, size],
      );
      return true;
    } catch (error) {
      console.error("Error adding file:", error);
      return false;
    }
  };
}
