import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";

export class EventRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;

  constructor(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  chat = {
    update: async (chatUUID: string, eventID: number): Promise<boolean> => {
      try {
        if (!chatUUID) {
          console.error("Missing required fields to update chat event ID.");
          return false;
        }
        await this.db.runAsync("UPDATE chat SET eventID = ? WHERE uuid = ?;", [
          eventID,
          chatUUID,
        ]);
        console.log(`Chat ${chatUUID} event ID updated to ${eventID}.`);
        return true;
      } catch (error) {
        console.error("Error updating chat event ID:", error);
        return false;
      }
    },
  };

  user = {
    profile: {
      update: async (
        userUUID: string,
        profileEventID: number,
      ): Promise<boolean> => {
        try {
          if (!userUUID) {
            console.error(
              "Missing required fields to update user profile event ID.",
            );
            return false;
          }
          await this.db.runAsync(
            "UPDATE user SET profileEventID = ? WHERE uuid = ?;",
            [profileEventID, userUUID],
          );
          console.log(
            `User ${userUUID} profile event ID updated to ${profileEventID}.`,
          );
          return true;
        } catch (error) {
          console.error("Error updating user profile event ID:", error);
          return false;
        }
      },
    },
  };
}
