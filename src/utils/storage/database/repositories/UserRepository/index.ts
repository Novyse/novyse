import { SQLiteDatabase } from "expo-sqlite";
import { ProfileRepository } from "./ProfileRepository";

export class UserRepository {
  db: SQLiteDatabase;
  profile: ProfileRepository;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.profile = new ProfileRepository(db);
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
    this.profile.setDb(db);
  }

  /**
   * Adds a user to the database.
   * @param {Object} user - User object containing uuid, name, surname, profilePictureUuid, handle, description, birthday, region, country
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
        INSERT OR IGNORE INTO user (uuid, name, surname, profilePictureUUID, description, birthday, region, country, profileEventID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          user.uuid,
          user.name,
          user.surname || null,
          user.profilePictureUUID || null,
          user.description || null,
          user.birthday || null,
          user.region || null,
          user.country || null,
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
      chats: { chatUUID: string; messageID: number; eventID: number }[];
      users: { userUUID: string; profileEventID: number }[];
    }> => {
      try {
        const chats: any[] = await this.db.getAllAsync(`
          SELECT 
            c.uuid as chatUUID, 
            COALESCE(c.eventID, 0) as eventID, 
            COALESCE(MAX(m.id), 0) as messageID
          FROM chat c
          LEFT JOIN message m ON c.uuid = m.chatUUID
          GROUP BY c.uuid
        `);

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
