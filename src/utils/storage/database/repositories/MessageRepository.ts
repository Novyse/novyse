import { SQLiteDatabase } from "expo-sqlite";

export class MessageRepository {
  db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  setDb(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Adds a message to the database.
   * @param {Object} message - Message object containing id, chatUUID, senderUUID, content, fileUUID, createdAt, isPinned,
   * @returns {boolean} true if message added successfully, false otherwise
   */
  async add(message: any): Promise<boolean> {
    try {
      if (
        !message ||
        message.id === undefined ||
        !message.chatUUID ||
        !message.senderUUID ||
        !message.created_at
      ) {
        console.error("Missing required message fields:", message);
        return false;
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO message (id, chatUUID, senderUUID, content, type, system_action, created_at, replyTo_chatUUID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.content || null,
          message.type || "message",
          message.system_action || null,
          message.created_at,
          message.replyTo?.chatUUID || null,
          message.replyTo?.messageID || null,
          message.replyTo?.rangeStart !== undefined
            ? message.replyTo.rangeStart
            : null,
          message.replyTo?.rangeEnd !== undefined
            ? message.replyTo.rangeEnd
            : null,
        ],
      );

      // Add multiple replyTos to message_reply table
      if (message.replyTos && Array.isArray(message.replyTos)) {
        for (const reply of message.replyTos) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO message_reply (chatUUID, messageID, replyTo_chatUUID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd) VALUES (?, ?, ?, ?, ?, ?);`,
            [
              message.chatUUID,
              message.id,
              reply.chatUUID,
              reply.messageID,
              reply.rangeStart !== undefined ? reply.rangeStart : null,
              reply.rangeEnd !== undefined ? reply.rangeEnd : null,
            ],
          );
        }
      }

      // Add files to file table and message_files table if present
      if (message.files && Array.isArray(message.files)) {
        console.log;
        for (const file of message.files) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO file (uuid, name, ref, mimeType, size, waveform, duration) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
              file.uuid,
              file.name,
              file.ref,
              file.mimeType,
              file.size,
              file.waveform ? JSON.stringify(file.waveform) : null,
              file.duration,
            ],
          );
          await this.db.runAsync(
            `INSERT OR IGNORE INTO message_files (chatUUID, messageID, fileUUID) VALUES (?, ?, ?);`,
            [message.chatUUID, message.id, file.uuid],
          );
        }
      }

      const readsToStore =
        message.reads ||
        message.readBy ||
        (message.message_reads
          ? message.message_reads.map((r: any) => ({
              userUUID: r.user_uuid,
              readAt: r.read_at,
            }))
          : []);

      if (readsToStore && Array.isArray(readsToStore)) {
        for (const read of readsToStore) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO message_read (chat_uuid, message_id, user_uuid, read_at) VALUES (?, ?, ?, ?);`,
            [message.chatUUID, message.id, read.userUUID, read.readAt],
          );
        }
      }

      if (message.reactions && Array.isArray(message.reactions)) {
        for (const reaction of message.reactions) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO reaction_message (chatUUID, messageID, userUUID, reaction, at) VALUES (?, ?, ?, ?, ?);`,
            [
              message.chatUUID,
              message.id,
              reaction.userUUID,
              reaction.reaction,
              reaction.created_at,
            ],
          );
        }
      }

      console.log("Message added or already exists.", message.id);
      return true;
    } catch (error) {
      console.error("Error adding message:", error, message);
      return false;
    }
  }

  async _addInfos(message: any): Promise<any> {
    if (!message) return message;
    await this._addReplyTos(message);
    await this._addRepliedFroms(message);
    await this._addReactions(message);
    await this._addReads(message);
    await this._addFiles(message);
    return message;
  }

  async _addReads(message: any): Promise<void> {
    if (!message) return;
    const reads: any[] = await this.db.getAllAsync(
      `SELECT user_uuid, read_at FROM message_read WHERE chat_uuid = ? AND message_id = ?;`,
      [message.chatUUID, message.id],
    );
    message.readBy = reads.map((r: any) => ({
      userUUID: r.user_uuid,
      readAt: r.read_at,
    }));
  }

  async _addReplyTos(message: any): Promise<void> {
    if (!message) return;
    const replyTosRaw: any[] = await this.db.getAllAsync(
      `SELECT * FROM message_reply WHERE chatUUID = ? AND messageID = ?;`,
      [message.chatUUID, message.id],
    );
    message.replyTos = replyTosRaw.map((r: any) => ({
      chatUUID: r.replyTo_chatUUID,
      messageID: r.replyTo_messageID,
      rangeStart: r.replyTo_rangeStart,
      rangeEnd: r.replyTo_rangeEnd,
    }));
  }

  async _addRepliedFroms(message: any): Promise<void> {
    if (!message) return;
    const repliedFromRaw: any[] = await this.db.getAllAsync(
      `SELECT chatUUID, messageID FROM message_reply WHERE replyTo_chatUUID = ? AND replyTo_messageID = ?;`,
      [message.chatUUID, message.id],
    );
    message.repliedFroms = repliedFromRaw.map((r: any) => ({
      chatUUID: r.chatUUID,
      messageID: r.messageID,
    }));
  }

  async _addReactions(message: any): Promise<void> {
    if (!message) return;
    const reactionsRaw: any[] = await this.db.getAllAsync(
      `SELECT reaction, userUUID, at FROM reaction_message WHERE chatUUID = ? AND messageID = ?;`,
      [message.chatUUID, message.id],
    );
    const reactionsMap: any = {};
    for (const r of reactionsRaw) {
      if (!reactionsMap[r.reaction]) {
        reactionsMap[r.reaction] = [];
      }
      reactionsMap[r.reaction].push({ userUUID: r.userUUID, at: r.at });
    }
    message.reactions = Object.keys(reactionsMap).map((emoji: any) => ({
      emoji,
      userUUIDs: reactionsMap[emoji].map((r: any) => r.userUUID),
      details: reactionsMap[emoji],
    }));
  }

  async _addFiles(message: any): Promise<void> {
    if (!message) return;
    const files: any[] = await this.db.getAllAsync(
      `SELECT f.* FROM file f
         JOIN message_files mf ON f.uuid = mf.fileUUID
         WHERE mf.chatUUID = ? AND mf.messageID = ?;`,
      [message.chatUUID, message.id],
    );
    message.files = files;
  }

  /*
   * Add multiple messages to the database in a single query.
   * @param {Array} messages - Array of message objects to add
   * @returns {boolean} true if messages added successfully, false otherwise
   */
  async addMultiple(messages: any[]): Promise<boolean> {
    try {
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error("No messages to add.");
        return false;
      }
      const placeholders = messages
        .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .join(", ");
      const values: any[] = [];
      for (const message of messages) {
        if (
          message.id === undefined ||
          !message.chatUUID ||
          !message.senderUUID ||
          !message.created_at
        ) {
          console.error("Missing required message fields:", message);
          continue;
        }
        values.push(
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.content || null,
          message.type || "message",
          message.system_action || null,
          message.created_at,
          message.replyTo?.chatUUID || null,
          message.replyTo?.messageID || null,
          message.replyTo?.rangeStart !== undefined
            ? message.replyTo.rangeStart
            : null,
          message.replyTo?.rangeEnd !== undefined
            ? message.replyTo.rangeEnd
            : null,
        );
      }
      await this.db.runAsync(
        `INSERT OR IGNORE INTO message (id, chatUUID, senderUUID, content, type, system_action, created_at, replyTo_chatUUID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd) VALUES ${placeholders};`,
        values,
      );
      console.log(`${messages.length} messages added successfully.`);

      for (const message of messages) {
        if (message.replyTos && Array.isArray(message.replyTos)) {
          for (const reply of message.replyTos) {
            await this.db.runAsync(
              `INSERT OR IGNORE INTO message_reply (chatUUID, messageID, replyTo_chatUUID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd) VALUES (?, ?, ?, ?, ?, ?);`,
              [
                message.chatUUID,
                message.id,
                reply.chatUUID,
                reply.messageID,
                reply.rangeStart !== undefined ? reply.rangeStart : null,
                reply.rangeEnd !== undefined ? reply.rangeEnd : null,
              ],
            );
          }
        }
        if (message.edited) {
          await this.db.runAsync(
            `INSERT OR IGNORE INTO edited_message (chatUUID, messageID) VALUES (?, ?);`,
            [message.chatUUID, message.id],
          );
        }
        if (message.reactions && Array.isArray(message.reactions)) {
          for (const reaction of message.reactions) {
            await this.db.runAsync(
              `INSERT OR IGNORE INTO reaction_message (chatUUID, messageID, userUUID, reaction, at) VALUES (?, ?, ?, ?, ?);`,
              [
                message.chatUUID,
                message.id,
                reaction.userUUID,
                reaction.reaction,
                reaction.created_at,
              ],
            );
          }
        }
      }

      const allReads: any[] = [];
      for (const message of messages) {
        const readsToStore =
          message.reads ||
          message.readBy ||
          (message.message_reads
            ? message.message_reads.map((r: any) => ({
                userUUID: r.user_uuid,
                readAt: r.read_at,
              }))
            : []);

        if (readsToStore && Array.isArray(readsToStore)) {
          for (const read of readsToStore) {
            allReads.push([
              message.chatUUID,
              message.id,
              read.userUUID,
              read.readAt,
            ]);
          }
        }
      }

      if (allReads.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < allReads.length; i += CHUNK_SIZE) {
          const chunk = allReads.slice(i, i + CHUNK_SIZE);
          const rPlaceholders = chunk.map(() => "(?, ?, ?, ?)").join(", ");
          const flatValues = chunk.flat();
          await this.db.runAsync(
            `INSERT OR IGNORE INTO message_read (chat_uuid, message_id, user_uuid, read_at) VALUES ${rPlaceholders};`,
            flatValues,
          );
        }
      }

      const allFiles: any[] = [];
      const allMessageFiles: any[] = [];
      for (const message of messages) {
        if (message.files && Array.isArray(message.files)) {
          for (const file of message.files) {
            if (
              !file.uuid ||
              !file.name ||
              !file.mimeType ||
              file.size === undefined
            ) {
              console.warn("Skipping invalid file:", file);
              continue;
            }
            allFiles.push(file);
            allMessageFiles.push({
              chatUUID: message.chatUUID,
              messageID: message.id,
              fileUUID: file.uuid,
            });
          }
        }
      }
      if (allFiles.length > 0) {
        const filePlaceholders = allFiles
          .map(() => `(?, ?, ?, ?, ?, ?, ?)`)
          .join(", ");
        const fileValues: any[] = [];
        for (const file of allFiles) {
          fileValues.push(
            file.uuid,
            file.name,
            file.ref || null,
            file.mimeType,
            file.size,
            file.waveform ? JSON.stringify(file.waveform) : null,
            file.duration || 0,
          );
        }
        await this.db.runAsync(
          `INSERT OR IGNORE INTO file (uuid, name, ref, mimeType, size, waveform, duration) VALUES ${filePlaceholders};`,
          fileValues,
        );
      }
      if (allMessageFiles.length > 0) {
        const mfPlaceholders = allMessageFiles
          .map(() => `(?, ?, ?)`)
          .join(", ");
        const mfValues: any[] = [];
        for (const mf of allMessageFiles) {
          mfValues.push(mf.chatUUID, mf.messageID, mf.fileUUID);
        }
        await this.db.runAsync(
          `INSERT OR IGNORE INTO message_files (chatUUID, messageID, fileUUID) VALUES ${mfPlaceholders};`,
          mfValues,
        );
      }
      return true;
    } catch (error) {
      console.error("Error adding multiple messages:", error);
      return false;
    }
  }

  get = {
    by: {
      id: async (chatUUID: any, messageID: any): Promise<any> => {
        try {
          const message: any = await this.db.getFirstAsync(
            `SELECT m.*, u.name as sender_name FROM message m 
           JOIN user u ON m.senderUUID = u.uuid 
           WHERE m.chatUUID = ? AND m.id = ?;`,
            [chatUUID, messageID],
          );
          if (!message) {
            return null;
          }
          await this._addInfos(message);
          return message || null;
        } catch (error) {
          console.error("Error retrieving message:", error);
          return null;
        }
      },
      chatUUID: async (
        chatUUID: any,
        limit = 50,
        offset = 0,
      ): Promise<any[]> => {
        try {
          const results: any[] = await this.db.getAllAsync(
            `SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?;`,
            [chatUUID, limit, offset],
          );
          // Reverse to maintain chronological order after fetching mostly recent first
          const messages = results.reverse();
          // Add files and external entities to each message
          for (const message of messages) {
            await this._addInfos(message);
          }
          return messages;
        } catch (error) {
          console.error("Error retrieving messages by chat UUID:", error);
          return [];
        }
      },
    },
  };

  async edit(chatUUID: any, messageID: any, content: any): Promise<boolean> {
    try {
      await this.db.runAsync(
        `UPDATE message SET content = ? WHERE chatUUID = ? AND id = ?;`,
        [content, chatUUID, messageID],
      );
      await this.db.runAsync(
        `INSERT OR IGNORE INTO edited_message (chatUUID, messageID) VALUES (?, ?);`,
        [chatUUID, messageID],
      );
      console.log(`Message ${messageID} edited successfully.`);
      return true;
    } catch (error) {
      console.error("Error editing message:", error);
      return false;
    }
  }

  async delete(chatUUID: any, messageID: any): Promise<boolean> {
    try {
      await this.db.runAsync(
        `DELETE FROM message WHERE chatUUID = ? AND id = ?;`,
        [chatUUID, messageID],
      );
      console.log(`Message ${messageID} deleted successfully.`);
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      return false;
    }
  }

  pin = {
    add: async (
      chatUUID: any,
      messageID: any,
      pinnedAt: any = new Date().toISOString(),
      pinnedBy: any,
    ): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `INSERT INTO pinned_message (chatUUID, messageID, pinned_at, pinned_by) VALUES (?, ?, ?, ?);`,
          [chatUUID, messageID, pinnedAt, pinnedBy],
        );
        console.log(`Message ${messageID} pinned successfully.`);
        return true;
      } catch (error) {
        console.error("Error pinning message:", error);
        return false;
      }
    },
    remove: async (chatUUID: any, messageID: any): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `DELETE FROM pinned_message WHERE chatUUID = ? AND messageID = ?;`,
          [chatUUID, messageID],
        );
        console.log(`Message ${messageID} unpinned successfully.`);
        return true;
      } catch (error) {
        console.error("Error unpinning message:", error);
        return false;
      }
    },
    get: async (chatUUID: any): Promise<any[]> => {
      try {
        const pinnedMessages: any[] = await this.db.getAllAsync(
          `SELECT messageID FROM pinned_message WHERE chatUUID = ?;`,
          [chatUUID],
        );
        return pinnedMessages.map((m: any) => m.messageID);
      } catch (error) {
        console.error("Error retrieving pinned messages:", error);
        return [];
      }
    },
  };

  last = {
    get: async (chatUUID: any): Promise<any[]> => {
      try {
        const result: any[] = await this.db.getAllAsync(
          `SELECT m.*, u.name as sender_name 
             FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ?
             ORDER BY m.created_at DESC
             LIMIT 1;`,
          [chatUUID],
        );

        for (const message of result) {
          await this._addInfos(message);
        }

        return result;
      } catch (error) {
        console.error("Error getting last message for chat:", chatUUID, error);
        return [];
      }
    },
  };

  reaction = {
    add: async (
      chatUUID: any,
      messageID: any,
      reaction: any,
      at: any,
      userUUID: any,
    ): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO reaction_message (chatUUID, messageID, userUUID, reaction, at) VALUES (?, ?, ?, ?, ?);`,
          [chatUUID, messageID, userUUID, reaction, at],
        );
        console.log(`Reaction ${reaction} added successfully.`);
        return true;
      } catch (error) {
        console.error("Error adding reaction:", error);
        return false;
      }
    },
    remove: async (
      chatUUID: any,
      messageID: any,
      reaction: any,
      userUUID: any,
    ): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `DELETE FROM reaction_message WHERE chatUUID = ? AND messageID = ? AND userUUID = ? AND reaction = ?;`,
          [chatUUID, messageID, userUUID, reaction],
        );
        console.log(`Reaction ${reaction} removed successfully.`);
        return true;
      } catch (error) {
        console.error("Error removing reaction:", error);
        return false;
      }
    },
  };

  read = {
    add: async (
      chatUUID: any,
      messageID: any,
      userUUID: any,
      readAt: any,
    ): Promise<boolean> => {
      try {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO message_read (chat_uuid, message_id, user_uuid, read_at) VALUES (?, ?, ?, ?);`,
          [chatUUID, messageID, userUUID, readAt],
        );
        console.log(
          `Read tracking for message ${messageID} added successfully.`,
        );
        return true;
      } catch (error) {
        console.error("Error adding read tracking:", error);
        return false;
      }
    },
  };
}
