import { SQLiteDatabase } from "expo-sqlite";
import DesktopSQLiteAdapter from "@/src/utils/storage/database/desktopAdapter";
import { MemberRepository } from "./MemberRepository";

export class ChatRepository {
  db: SQLiteDatabase | DesktopSQLiteAdapter;
  member: MemberRepository;
  messageRepository: any;
  handleRepository: any;

  constructor(
    db: SQLiteDatabase | DesktopSQLiteAdapter,
    messageRepository?: any,
    handleRepository?: any,
  ) {
    this.db = db;
    this.member = new MemberRepository(db);
    this.messageRepository = messageRepository;
    this.handleRepository = handleRepository;
  }

  setDb(db: SQLiteDatabase | DesktopSQLiteAdapter) {
    this.db = db;
    this.member.setDb(db);
  }

  setRepositories(messageRepository: any, handleRepository: any) {
    this.messageRepository = messageRepository;
    this.handleRepository = handleRepository;
  }

  /**
   * Adds a chat to the database.
   * @param {Object} chat - Chat object containing uuid, type, name, handle, description, pictureUuid, members (array of user UUIDs)
   * @returns {boolean} true if chat added successfully, false otherwise
   */

  async add(chat: any): Promise<any> {
    try {
      if (
        !chat ||
        !chat.uuid ||
        !chat.type ||
        !chat.members ||
        !Array.isArray(chat.members)
      ) {
        console.error(
          "Missing required chat fields:",
          JSON.stringify({
            uuid: chat?.uuid,
            type: chat?.type,
            members: Array.isArray(chat?.members)
              ? chat.members.length
              : "not an array",
          }),
        );
        return false;
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO chat (uuid, type, name, description, profilePictureUUID, eventID) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          chat.uuid,
          chat.type,
          chat.name || null,
          chat.description || null,
          chat.profilePictureUUID || null,
          chat.eventID || 0,
        ],
      );

      if (chat.handle) {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?);`,
          [chat.uuid, chat.handle],
        );
      }
      for (const member of chat.members) {
        await this.member.add(chat.uuid, member);
      }

      if (chat.subs && Array.isArray(chat.subs)) {
        for (const sub of chat.subs) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, created_at) VALUES (?, ?, ?, ?);`,
            [sub.id, chat.uuid, sub.name, sub.created_at],
          );
        }
      }

      if (chat.pinnedMessages && this.messageRepository) {
        for (const pinnedMessage of chat.pinnedMessages) {
          await this.messageRepository.pin.add(
            chat.uuid,
            pinnedMessage.subID,
            pinnedMessage.messageID,
            pinnedMessage.pinnedAt,
            pinnedMessage.pinnedBy,
          );
        }
      }

      return true;
    } catch (error: any) {
      console.error("Error adding chat:", error);
      return false;
    }
  }

  /**
   * Adds multiple chats to the database.
   * @param {Array} chats - Array of chat objects
   * @returns {boolean} true if chats added successfully, false otherwise
   */
  async addMultiple(chats: any[]): Promise<boolean> {
    try {
      if (!chats || !Array.isArray(chats) || chats.length === 0) {
        console.error("No chats to add.");
        return false;
      }

      const chatPlaceholders = chats.map(() => `(?, ?, ?, ?, ?, ?)`).join(", ");

      const chatValues: any[] = [];
      for (const chat of chats) {
        chatValues.push(
          chat.uuid,
          chat.type,
          chat.name || null,
          chat.description || null,
          chat.profilePictureUUID || null,
          chat.eventID || 0,
        );
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO chat (uuid, type, name, description, profilePictureUUID, eventID) VALUES ${chatPlaceholders};`,
        chatValues,
      );

      const handles = chats.filter((c) => c.handle);
      if (handles.length > 0) {
        const handlePlaceholders = handles
          .map(() => `(?, 'CHAT', ?)`)
          .join(", ");
        const handleValues: any[] = [];
        for (const chat of handles) {
          handleValues.push(chat.uuid, chat.handle);
        }
        await this.db.runAsync(
          `INSERT OR IGNORE INTO handle (chatUUID, type, handle) VALUES ${handlePlaceholders};`,
          handleValues,
        );
      }

      // Bulk add members
      const allMembers: any[] = [];
      for (const chat of chats) {
        if (chat.members && Array.isArray(chat.members)) {
          for (const member of chat.members) {
            allMembers.push({ chatUUID: chat.uuid, user: member });
          }
        }
      }

      if (allMembers.length > 0) {
        await this.member.addMultiple(allMembers);
      }

      const allSubs: any[] = [];
      for (const chat of chats) {
        if (chat.subs && Array.isArray(chat.subs)) {
          for (const sub of chat.subs) {
            allSubs.push({ chatUUID: chat.uuid, ...sub });
          }
        }
      }

      if (allSubs.length > 0) {
        const subPlaceholders = allSubs.map(() => `(?, ?, ?, ?)`).join(", ");
        const subValues: any[] = [];
        for (const sub of allSubs) {
          subValues.push(
            sub.id || 0,
            sub.chatUUID,
            sub.name || null,
            sub.created_at || sub.createdAt || new Date().toISOString(),
          );
        }
        await this.db.runAsync(
          `INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, created_at) VALUES ${subPlaceholders};`,
          subValues,
        );
      }

      // Pinned messages
      if (this.messageRepository) {
        for (const chat of chats) {
          if (chat.pinnedMessages && Array.isArray(chat.pinnedMessages)) {
            for (const pinnedMessage of chat.pinnedMessages) {
              await this.messageRepository.pin.add(
                chat.uuid,
                pinnedMessage.subID,
                pinnedMessage.messageID,
                pinnedMessage.pinnedAt,
                pinnedMessage.pinnedBy,
              );
            }
          }
        }
      }

      console.log(`${chats.length} chats added successfully.`);
      return true;
    } catch (error: any) {
      console.error("Error adding multiple chats:", error);
      return false;
    }
  }

  pin = {
    add: async (chatUUID: any, position: any): Promise<any> => {
      try {
        if (!chatUUID) {
          console.error("Missing required fields to pin chat.");
          return false;
        }

        await this.db.runAsync("DELETE FROM chat_pin WHERE chatUUID = ?;", [
          chatUUID,
        ]);

        await this.db.runAsync(
          "UPDATE chat_pin SET position = position + 1 WHERE position >= ?;",
          [position],
        );

        await this.db.runAsync(
          "INSERT INTO chat_pin (chatUUID, position) VALUES (?, ?);",
          [chatUUID, position],
        );

        console.log(`Chat ${chatUUID} pinned at position ${position}.`);
        return true;
      } catch (error: any) {
        console.error("Error pinning chat:", error);
        return false;
      }
    },

    remove: async (chatUUID: any): Promise<any> => {
      try {
        if (!chatUUID) {
          console.error("Missing required fields to unpin chat.");
          return false;
        }

        const pin: any = await this.db.getFirstAsync(
          "SELECT position FROM chat_pin WHERE chatUUID = ?;",
          [chatUUID],
        );

        if (pin) {
          const deletedPosition: any = pin.position;

          await this.db.runAsync("DELETE FROM chat_pin WHERE chatUUID = ?;", [
            chatUUID,
          ]);

          await this.db.runAsync(
            "UPDATE chat_pin SET position = position - 1 WHERE position > ?;",
            [deletedPosition],
          );
        }

        console.log(`Chat ${chatUUID} unpinned successfully.`);
        return true;
      } catch (error: any) {
        console.error("Error unpinning chat:", error);
        return false;
      }
    },

    get: async (): Promise<any[]> => {
      try {
        const result: any[] = await this.db.getAllAsync(
          `SELECT * FROM chat_pin`,
        );
        return result;
      } catch (error: any) {
        console.error("Error getting pinned chats:", error);
        return [];
      }
    },
  };

  sub = {
    add: async (chatUUID: string, sub: any): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, created_at) VALUES (?, ?, ?, ?);`,
          [
            sub.id,
            chatUUID,
            sub.name,
            sub.created_at || sub.createdAt || new Date().toISOString(),
          ],
        );
        return true;
      } catch (error) {
        console.error("Error adding sub:", error);
        return false;
      }
    },
    update: async (
      chatUUID: string,
      subID: number,
      sub: any,
    ): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `UPDATE chat_sub SET name = ? WHERE chatUUID = ? AND id = ?;`,
          [sub?.name, chatUUID, subID],
        );
        return true;
      } catch (error) {
        console.error("Error updating sub:", error);
        return false;
      }
    },
    remove: async (chatUUID: string, subID: number): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `DELETE FROM message WHERE chatUUID = ? AND subID = ?;`,
          [chatUUID, subID],
        );
        await this.db.runAsync(
          `DELETE FROM chat_sub WHERE chatUUID = ? AND id = ?;`,
          [chatUUID, subID],
        );
        return true;
      } catch (error) {
        console.error("Error removing sub:", error);
        return false;
      }
    },
  };

  get = {
    all: async (localUserUUID?: string): Promise<any[]> => {
      try {
        const result: any[] = await this.db.getAllAsync(`SELECT * FROM chat`);

        for (const chat of result) {
          if (localUserUUID) {
            const row = await this.db.getFirstAsync<{ count: number }>(
              `SELECT COUNT(*) as count 
               FROM message 
               WHERE chatUUID = ? 
                 AND senderUUID != ?
                 AND id > (
                     SELECT COALESCE(MAX(message_id), 0) 
                     FROM message_read 
                     WHERE chat_uuid = ? AND user_uuid = ?
                 )
                 AND created_at > (
                     SELECT joined_at 
                     FROM member 
                     WHERE chatUUID = ? AND userUUID = ?
                 )`,
              [
                chat.uuid,
                localUserUUID,
                chat.uuid,
                localUserUUID,
                chat.uuid,
                localUserUUID,
              ],
            );
            chat.unreadCount = row?.count || 0;

            // Load oldest unread message if it exists
            const oldestRow = await this.db.getFirstAsync<{
              id: number;
              subID: number;
            }>(
              `SELECT id, subID
               FROM message 
               WHERE chatUUID = ? 
                 AND senderUUID != ?
                 AND id > (
                     SELECT COALESCE(MAX(message_id), 0) 
                     FROM message_read 
                     WHERE chat_uuid = ? AND user_uuid = ?
                 )
                 AND created_at > (
                     SELECT joined_at 
                     FROM member 
                     WHERE chatUUID = ? AND userUUID = ?
                 )
               ORDER BY created_at ASC
               LIMIT 1`,
              [
                chat.uuid,
                localUserUUID,
                chat.uuid,
                localUserUUID,
                chat.uuid,
                localUserUUID,
              ],
            );

            const initialMessages = [];
            if (oldestRow?.id && this.messageRepository) {
              const oldestUnread = await this.messageRepository.get.by.id(
                chat.uuid,
                oldestRow.subID,
                oldestRow.id,
              );
              if (oldestUnread) initialMessages.push(oldestUnread);
            }

            // Load last message and append if different from oldest unread
            if (this.messageRepository) {
              const lastMessageArr = await this.messageRepository.last.get(
                chat.uuid,
              );
              const lastMessage = lastMessageArr?.[0];
              if (
                lastMessage &&
                (!oldestRow?.id ||
                  lastMessage.id !== oldestRow.id ||
                  lastMessage.subID !== oldestRow.subID)
              ) {
                initialMessages.push(lastMessage);
              }
            }

            chat.messages = initialMessages;
          } else {
            chat.unreadCount = 0;
            if (this.messageRepository) {
              chat.messages = await this.messageRepository.last.get(chat.uuid);
            } else {
              chat.messages = [];
            }
          }

          chat.members = await this.member.get.by.chatUUID(chat.uuid);
          if (this.handleRepository) {
            chat.handle = await this.handleRepository.get.by.uuid(
              "chat",
              chat.uuid,
            );
          }

          chat.subs =
            (await this.db.getAllAsync(
              `SELECT * FROM chat_sub WHERE chatUUID = ? ORDER BY id ASC;`,
              [chat.uuid],
            )) || [];

          if (this.messageRepository) {
            const subLastMessages = await this.messageRepository.last.getBySub(
              chat.uuid,
            );
            const subMsgMap: any = {};
            for (const msg of subLastMessages) {
              subMsgMap[msg.subID] = msg;
            }
            for (const sub of chat.subs) {
              sub.lastMessage = subMsgMap[sub.id] || null;
            }
          }

          chat.pinnedMessages =
            (await this.db.getAllAsync(
              `SELECT * FROM pinned_message WHERE chatUUID = ?;`,
              [chat.uuid],
            )) || [];

          chat.editedMessages =
            (await this.db.getAllAsync(
              `SELECT * FROM edited_message WHERE chatUUID = ?;`,
              [chat.uuid],
            )) || [];

          chat.deletedMessages = [];
        }

        return result;
      } catch (error: any) {
        console.error("Error getting chats:", error);
        return [];
      }
    },
  };
}
