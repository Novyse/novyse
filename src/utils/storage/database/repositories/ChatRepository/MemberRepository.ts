import { SQLiteDatabase } from "expo-sqlite";

import { Member } from "@/src/types";

export class MemberRepository {
  db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  async add(chatUUID: string, user: any): Promise<boolean> {
    try {
      if (!chatUUID || !user || !user.uuid) {
        console.error(
          "Missing required fields to add member:",
          JSON.stringify({ chatUUID, user: user ? user.uuid : null }),
        );
        return false;
      }
      // Insert member into the member table
      await this.db.runAsync(
        `INSERT OR IGNORE INTO member (userUUID, chatUUID, joined_at) VALUES (?, ?, ?);`,
        [user.uuid, chatUUID, user.joined_at || new Date().toISOString()],
      );
      console.log(`User ${user.uuid} added to chat ${chatUUID} successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding member to chat:", error);
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
            `SELECT m.userUUID as uuid, m.joined_at as joinedAt
             FROM member m
             WHERE m.chatUUID = ?;`,
            [chatUUID],
          );

          return members.map((m) => ({
            uuid: m.uuid,
            role: "member",
            action: null,
            joinedAt: new Date(m.joinedAt),
          }));
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
