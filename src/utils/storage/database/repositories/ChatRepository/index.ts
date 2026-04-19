import { SQLiteDatabase } from "expo-sqlite";
import { MemberRepository } from "./MemberRepository";
import useUserStore from "@/context/UserContext";

import database from "@/src/utils/storage/database";

export class ChatRepository {
  db: SQLiteDatabase;
  member: MemberRepository;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.member = new MemberRepository(db);
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
    this.member.setDb(db);
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
        `INSERT OR IGNORE INTO chat (uuid, type, name, description, profilePictureUUID) VALUES (?, ?, ?, ?, ?);`,
        [
          chat.uuid,
          chat.type,
          chat.name || null,
          chat.description || null,
          chat.profilePictureUUID || null,
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

      if (chat.pinnedMessages) {
        for (const pinnedMessage of chat.pinnedMessages) {
          await database.message.pin.add(
            chat.uuid,
            pinnedMessage.messageID,
            pinnedMessage.pinned_at,
            pinnedMessage.pinned_by,
          );
        }
      }

      return true;
    } catch (error: any) {
      console.error("Error adding chat:", error);
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

  get = {
    all: async (): Promise<any[]> => {
      try {
        const result: any[] = await this.db.getAllAsync(`SELECT * FROM chat`);

        for (const chat of result) {
          chat.messages = await database.message.last.get(chat.uuid);

          const localUserUUID = useUserStore.getState().localUserUUID;

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
                 )`,
              [chat.uuid, localUserUUID, chat.uuid, localUserUUID],
            );
            chat.unreadCount = row?.count || 0;

            // Load oldest unread message ID if it exists
            const oldestRow = await this.db.getFirstAsync<{ id: number }>(
              `SELECT MIN(id) as id 
               FROM message 
               WHERE chatUUID = ? 
                 AND senderUUID != ?
                 AND id > (
                     SELECT COALESCE(MAX(message_id), 0) 
                     FROM message_read 
                     WHERE chat_uuid = ? AND user_uuid = ?
                 )`,
              [chat.uuid, localUserUUID, chat.uuid, localUserUUID],
            );

            const initialMessages = [];
            if (oldestRow?.id) {
              const oldestUnread = await database.message.get.by.id(
                chat.uuid,
                oldestRow.id,
              );
              if (oldestUnread) initialMessages.push(oldestUnread);
            }

            // Load last message and append if different from oldest unread
            const lastMessageArr = await database.message.last.get(chat.uuid);
            const lastMessage = lastMessageArr?.[0];
            if (
              lastMessage &&
              (!oldestRow?.id || lastMessage.id !== oldestRow.id)
            ) {
              initialMessages.push(lastMessage);
            }

            chat.messages = initialMessages;
          } else {
            chat.unreadCount = 0;
            chat.messages = await database.message.last.get(chat.uuid);
          }

          chat.members = await this.member.get.by.chatUUID(chat.uuid);
          chat.handle = await database.handle.get.by.uuid("chat", chat.uuid);

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
