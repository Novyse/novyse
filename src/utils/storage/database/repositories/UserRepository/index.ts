import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";
import { ProfileRepository } from "./ProfileRepository";

export class UserRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;
  profile: ProfileRepository;

  constructor(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
    this.profile = new ProfileRepository(db);
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
    this.profile.setDb(db);
  }

  /**
   * Adds a user to the database.
   * @param {Object} user - User object containing uuid, name, surname, profilePictureUuid, handle, biography, birthday, region, country
   * @returns {boolean} true if user added successfully, false otherwise
   */
  async add(user: any): Promise<boolean> {
    try {
      if (!user || !user.uuid || !user.name || !user.handle) {
        console.error(
          "Missing required user fields:",
          JSON.stringify({
            uuid: user?.uuid,
            name: user?.name,
            surname: user?.surname,
            handle: user?.handle,
          }),
        );
        return false;
      }

      // Insert user into the user table
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO user (uuid, name, surname, profilePictureUUID, bannerPictureUUID, biography, birthday, region, country, color, profileEventID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          user.uuid,
          user.name,
          user.surname || null,
          user.profilePictureUUID || null,
          user.bannerPictureUUID || null,
          user.biography || null,
          user.birthday || null,
          user.region || null,
          user.country || null,
          user.color || null,
          user.profileEventID || 0,
        ],
      );
      // Insert handle into the handle table
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO handle (userUUID, type, handle) VALUES (?, 'USER', ?);
      `,
        [user.uuid, user.handle],
      );
      console.log("User added successfully.", user.name);
      return true;
    } catch (error) {
      console.error("Error adding user:", error);
      return false;
    }
  }

  /**
   * Adds multiple users to the database.
   * @param {Array} users - Array of user objects
   * @returns {boolean} true if users added successfully, false otherwise
   */
  async addMultiple(users: any[]): Promise<boolean> {
    try {
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.error("No users to add.");
        return false;
      }

      const userPlaceholders = users
        .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .join(", ");

      const userValues: any[] = [];
      for (const user of users) {
        userValues.push(
          user.uuid,
          user.name,
          user.surname || null,
          user.profilePictureUUID || null,
          user.bannerPictureUUID || null,
          user.biography || null,
          user.birthday || null,
          user.region || null,
          user.country || null,
          user.color || null,
          user.profileEventID || 0,
        );
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO user (uuid, name, surname, profilePictureUUID, bannerPictureUUID, biography, birthday, region, country, color, profileEventID) VALUES ${userPlaceholders};`,
        userValues,
      );

      const handlePlaceholders = users.map(() => `(?, 'USER', ?)`).join(", ");

      const handleValues: any[] = [];
      for (const user of users) {
        handleValues.push(user.uuid, user.handle);
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO handle (userUUID, type, handle) VALUES ${handlePlaceholders};`,
        handleValues,
      );

      console.log(`${users.length} users added successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding multiple users:", error);
      return false;
    }
  }

  get = {
    /**
     * Get user info by UUID.
     * @param {String} userUUID
     * @returns {Object} user object or null if not found
     */
    byUUID: async (userUUID: any): Promise<any> => {
      try {
        const user: any = await this.db.getFirstAsync(
          `SELECT * FROM user WHERE uuid = ?;`,
          [userUUID],
        );
        if (user) {
          const handleRow: any = await this.db.getFirstAsync(
            `SELECT handle FROM handle WHERE userUUID = ? AND type = 'USER';`,
            [userUUID],
          );
          if (handleRow) {
            user.handle = handleRow.handle;
          }
        }
        return user;
      } catch (error) {
        console.error("Error retrieving user by UUID:", error);
        return null;
      }
    },
    /**
     * Get all users from the database.
     * @returns {Array} array of user objects with handles
     */
    all: async (): Promise<any[]> => {
      try {
        const users: any[] = await this.db.getAllAsync(
          `SELECT u.*, h.handle FROM user u
             LEFT JOIN handle h ON u.uuid = h.userUUID AND h.type = 'USER';`,
        );
        return users || [];
      } catch (error) {
        console.error("Error retrieving all users:", error);
        return [];
      }
    },
    /**
     * Get user info by handle.
     * @param {String} handle @returns {Object} user object or null if not found
     */
    byHandle: async (handle: any): Promise<any> => {
      try {
        const row: any = await this.db.getFirstAsync(
          `SELECT userUUID FROM handle WHERE handle = ? AND type = 'USER';`,
          [handle],
        );
        if (row && row.userUUID) {
          const user: any = await this.db.getFirstAsync(
            `SELECT * FROM user WHERE uuid = ?;`,
            [row.userUUID],
          );
          if (user) {
            user.handle = handle;
            return user;
          }
        }
        return null;
      } catch (error) {
        console.error("Error retrieving user by handle:", error);
        return null;
      }
    },
  };

  update = {
    /**
     * Get all event IDs for chats and users for synchronization.
     * @returns {Object} { chats: Array, users: Array }
     */
    getAllEventsIDs: async (): Promise<{
      chats: {
        chatUUID: string;
        eventID: number;
        subs: { subID: number; messageID: number }[];
      }[];
      users: { userUUID: string; profileEventID: number }[];
    }> => {
      try {
        const chatRows: any[] = await this.db.getAllAsync(`
          SELECT
            uuid as chatUUID,
            COALESCE(eventID, 0) as eventID
          FROM chat
        `);

        const subRows: any[] = await this.db.getAllAsync(`
          SELECT
            chatUUID,
            subID,
            COALESCE(MAX(id), 0) as messageID
          FROM message
          GROUP BY chatUUID, subID
        `);

        const subsByChat: Record<
          string,
          { subID: number; messageID: number }[]
        > = {};
        for (const row of subRows) {
          if (!subsByChat[row.chatUUID]) subsByChat[row.chatUUID] = [];
          subsByChat[row.chatUUID].push({
            subID: row.subID,
            messageID: row.messageID,
          });
        }

        const chats = chatRows.map((c: any) => ({
          chatUUID: c.chatUUID,
          eventID: c.eventID,
          subs: subsByChat[c.chatUUID] || [],
        }));

        const users: any[] = await this.db.getAllAsync(`
          SELECT
            uuid as userUUID,
            COALESCE(profileEventID, 0) as profileEventID
          FROM user
        `);

        return { chats, users };
      } catch (error) {
        console.error("Error retrieving all event IDs:", error);
        return { chats: [], users: [] };
      }
    },
  };
}
