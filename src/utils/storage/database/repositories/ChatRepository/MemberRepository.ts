import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";

import { Member } from "@/src/types";

export class MemberRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;

  constructor(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
  }

  async add(chatUUID: string, user: any): Promise<boolean> {
    try {
      const userUUID = typeof user === "string" ? user : user?.uuid;
      if (!chatUUID || !userUUID) {
        console.error(
          "Missing required fields to add member:",
          JSON.stringify({ chatUUID, user }),
        );
        return false;
      }
      const roles = user.roleIDs ?? [];
      await this.db.runAsync(
        `INSERT OR IGNORE INTO member (userUUID, chatUUID, role_ids, joined_at) VALUES (?, ?, ?, ?);`,
        [userUUID, chatUUID, JSON.stringify(roles), user.joinedAt],
      );
      console.log(`User ${userUUID} added to chat ${chatUUID} successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding member to chat:", error);
      return false;
    }
  }

  /**
   * Adds multiple members to the database.
   * @param {Array} members - Array of { chatUUID, user } objects
   * @returns {boolean} true if members added successfully, false otherwise
   */
  async addMultiple(members: any[]): Promise<boolean> {
    try {
      if (!members || !Array.isArray(members) || members.length === 0) {
        console.error("No members to add.");
        return false;
      }

      const placeholders = members.map(() => `(?, ?, ?, ?)`).join(", ");
      const values: any[] = [];

      for (const m of members) {
        const u = m.user;
        const userUUID = typeof u === "string" ? u : u?.uuid;
        const roles = u?.roleIDs ?? [];
        values.push(userUUID, m.chatUUID, JSON.stringify(roles), u?.joinedAt);
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO member (userUUID, chatUUID, role_ids, joined_at) VALUES ${placeholders};`,
        values,
      );

      console.log(`${members.length} members added successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding multiple members:", error);
      return false;
    }
  }

  get = {
    by: {
      chatUUID: async (chatUUID: string): Promise<Member[]> => {
        try {
          if (!chatUUID) {
            console.error(
              "Missing required field to get members by chat UUID:",
              JSON.stringify({ chatUUID }),
            );
            return [];
          }

          const members = await this.db.getAllAsync<any>(
            `SELECT m.userUUID as uuid, m.joined_at as joinedAt, m.role_ids as roleIds
             FROM member m
             WHERE m.chatUUID = ?;`,
            [chatUUID],
          );

          return members.map((m) => {
            let parsedRoleIds = [];
            try {
              parsedRoleIds =
                typeof m.roleIds === "string"
                  ? JSON.parse(m.roleIds)
                  : m.roleIds || [];
            } catch (e) {
              console.error("Failed to parse role_ids", m.roleIds);
            }
            return {
              uuid: m.uuid,
              roleIDs: parsedRoleIds,
              action: null,
              joinedAt: new Date(m.joinedAt),
            };
          });
        } catch (error) {
          console.error("Error retrieving members by chat UUID:", error);
          return [];
        }
      },
    },
  };

  // async removeMember(chatUUID, user) {
  //   try {
  //     if (!chatUUID || !user || !user.uuid) {
  //       console.error(
  //         "Missing required fields to remove member:",
  //         JSON.stringify({ chatUUID, user: user ? user.uuid : null })
  //       );
  //       return false;
  //     }
  //     const result = await this.db.runAsync(
  //       `DELETE FROM member WHERE userUUID = ? AND chatUUID = ?;`,
  //       [user.uuid, chatUUID]
  //     );
  //     if (result.changes > 0) {
  //       console.log(
  //         `User ${user.uuid} removed from chat ${chatUUID} successfully.`
  //       );

  //       // Remove from user and handle table if not member of any other chat @SamueleOrazioDurante
  //       return true;
  //     }
  //     console.log(
  //       `User ${user.uuid} was not a member of chat ${chatUUID}. No action taken.`
  //     );
  //     return false;
  //   } catch (error) {
  //     console.error("Error removing member from chat:", error);
  //     return false;
  //   }
  // }
}
