import { SQLiteDatabase } from "expo-sqlite";

import INIT_SQL from "./init.sql.ts";

import { UserRepository } from "./repositories/UserRepository";
import { HandleRepository } from "./repositories/HandleRepository";
import { ChatRepository } from "./repositories/ChatRepository";
import { MessageRepository } from "./repositories/MessageRepository";
import { FileRepository } from "./repositories/FileRepository";
import { EventRepository } from "./repositories/EventRepository";

class Database {
  constructor(db) {
    this.db = db;
    this.user = new UserRepository(db);
    this.handle = new HandleRepository(db);
    this.message = new MessageRepository(db);
    this.chat = new ChatRepository(db, this.message, this.handle);
    this.file = new FileRepository(db);
    this.event = new EventRepository(db);
  }

  setDb(db) {
    this.db = db;
    this.user.setDb(db);
    this.handle.setDb(db);
    this.message.setDb(db);
    this.chat.setDb(db);
    this.chat.setRepositories(this.message, this.handle);
    this.file.setDb(db);
    this.event.setDb(db);
  }

  async initialize() {
    return await this.db.execAsync(INIT_SQL);
  }

  async clear() {
    try {
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      );
      if (tables && tables.length > 0) {
        for (const table of tables) {
          await this.db.execAsync(`DROP TABLE IF EXISTS ${table.name};`);
        }
      }
      console.log("Database cleared successfully.");
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  }

  // @SamueleOrazioDurante la roba pending sotto deve sparire quando rifai queu manager fatto bene

  /**
   * Adds a pending message to the database.
   * @param {Object} pendingMessage - Pending message object containing id, jobType, chatUUID, senderUUID, content, type, files
   * @returns {boolean} true if pending message added successfully, false otherwise
   */

  async addPendingMessage(pendingMessage) {
    try {
      if (
        !pendingMessage ||
        !pendingMessage.id ||
        !pendingMessage.jobType ||
        !pendingMessage.chatUUID ||
        !pendingMessage.senderUUID ||
        !pendingMessage.type
      ) {
        console.error(
          "Missing required pending message fields:",
          JSON.stringify({
            id: pendingMessage?.id,
            jobType: pendingMessage?.jobType,
            type: pendingMessage?.type,
            chatUUID: pendingMessage?.chatUUID,
            senderUUID: pendingMessage?.senderUUID,
          }),
        );
        return false;
      }
      await this.db.runAsync(
        `INSERT OR IGNORE INTO pending_message (id, jobType, chatUUID, senderUUID, content, type, replyTo_chatUUID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          pendingMessage.id,
          pendingMessage.jobType,
          pendingMessage.chatUUID,
          pendingMessage.senderUUID,
          pendingMessage.content || null,
          pendingMessage.type || "message",
          pendingMessage.replyTo?.chatUUID || null,
          pendingMessage.replyTo?.messageID || null,
          pendingMessage.replyTo?.rangeStart !== undefined
            ? pendingMessage.replyTo.rangeStart
            : null,
          pendingMessage.replyTo?.rangeEnd !== undefined
            ? pendingMessage.replyTo.rangeEnd
            : null,
        ],
      );

      // Insert files into pending_file table
      if (pendingMessage.files && Array.isArray(pendingMessage.files)) {
        for (let i = 0; i < pendingMessage.files.length; i++) {
          const file = pendingMessage.files[i];
          await this.db.runAsync(
            `INSERT INTO pending_file (index, pendingMessageID, uri, mimeType) VALUES (?, ?, ?);`,
            [i, pendingMessage.id, file.uri, file.mimeType],
          );
        }
      }
      console.log("Pending message added successfully.", pendingMessage.id);
      return true;
    } catch (error) {
      console.error("Error adding pending message:", error);
      return false;
    }
  }
  /**
   * Remove a pending message from the database.
   * @param {String} pendingMessageID - ID of the pending message to remove
   * @returns {boolean} true if pending message removed successfully, false otherwise
   */

  async removePendingMessage(pendingMessageID) {
    try {
      if (!pendingMessageID) {
        console.error("Missing pending message ID to remove.");
        return false;
      }
      // First, delete associated files from pending_file table
      await this.db.runAsync(
        `DELETE FROM pending_file WHERE pendingMessageID = ?;`,
        [pendingMessageID],
      );
      // Then, delete the pending message
      const result = await this.db.runAsync(
        `DELETE FROM pending_message WHERE id = ?;`,
        [pendingMessageID],
      );
      if (result.changes > 0) {
        console.log(
          `Pending message ${pendingMessageID} and associated files removed successfully.`,
        );
        return true;
      }
      console.log(
        `Pending message ${pendingMessageID} not found. No action taken.`,
      );
      return false;
    } catch (error) {
      console.error("Error removing pending message:", error);
      return false;
    }
  }

  _mapMessageReplyTo(message) {
    if (!message || message.replyTo_chatUUID === undefined) return message;
    if (
      message.replyTo_chatUUID ||
      message.replyTo_messageID ||
      (message.replyTo_rangeStart !== null &&
        message.replyTo_rangeStart !== undefined) ||
      (message.replyTo_rangeEnd !== null &&
        message.replyTo_rangeEnd !== undefined)
    ) {
      message.replyTo = {
        chatUUID: message.replyTo_chatUUID,
        messageID: message.replyTo_messageID,
        rangeStart: message.replyTo_rangeStart,
        rangeEnd: message.replyTo_rangeEnd,
      };
    }
    delete message.replyTo_chatUUID;
    delete message.replyTo_messageID;
    delete message.replyTo_rangeStart;
    delete message.replyTo_rangeEnd;
    return message;
  }

  /**
   * Fetch all pending messages from the database.
   * @returns {Array} array of pending message objects
   */

  async getPendingMessages() {
    try {
      const pendingMessages = await this.db.getAllAsync(
        "SELECT * FROM pending_message;",
      );
      for (const message of pendingMessages) {
        this._mapMessageReplyTo(message);
        const files = await this.db.getAllAsync(
          "SELECT * FROM pending_file WHERE pendingMessageID = ?;",
          [message.id],
        );
        message.files = files;
      }
      return pendingMessages;
    } catch (error) {
      console.error("Error retrieving pending messages:", error);
      return [];
    }
  }

  /**
   * Fetch all pending message from a specific chat UUID
   * @param {String} chatUUID
   * @returns {Array} array of pending message objects
   */

  async getPendingMessagesByChatUUID(chatUUID) {
    try {
      const pendingMessages = await this.db.getAllAsync(
        "SELECT * FROM pending_message WHERE chatUUID = ?;",
        [chatUUID],
      );
      for (const message of pendingMessages) {
        this._mapMessageReplyTo(message);
        const files = await this.db.getAllAsync(
          "SELECT * FROM pending_file WHERE pendingMessageID = ?;",
          [message.id],
        );
        message.files = files;
      }
      return pendingMessages;
    } catch (error) {
      console.error("Error retrieving pending messages by chat UUID:", error);
      return [];
    }
  }
  /**
   * Update a pending message in the database.
   * @param {String} pendingMessageID - ID of the pending message to update
   * @param {String} newPendingMessageUUID - new UUID for the pending message
   * @param {Object} files - files to update
   * @returns {boolean} true if pending message updated successfully, false otherwise
   */

  async updatePendingMessageForUpload(
    pendingMessageID,
    newPendingMessageUUID,
    files,
  ) {
    try {
      if (!pendingMessageID || !files) {
        console.error("Missing required fields to update pending message.");
        return false;
      }
      // Update pending_message table
      await this.db.runAsync(
        `UPDATE pending_message SET id = ?, jobType = 'upload' WHERE id = ?;`,
        [newPendingMessageUUID, pendingMessageID],
      );
      // Update pending_file table with new pendingMessageID, set s3Url to uploadURL and set new ref, removing the old uri
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await this.db.runAsync(
          `UPDATE pending_file SET pendingMessageID = ?, uuid = ?, s3Url = ?, ref = ?, uri = null WHERE index = ? AND pendingMessageID = ?;`,
          [
            newPendingMessageUUID,
            file.uuid || null,
            file.s3Url || null,
            file.ref || null,
            i,
            pendingMessageID,
          ],
        );
      }
      console.log(
        `Pending message ${pendingMessageID} updated successfully for upload.`,
      );

      return true;
    } catch (error) {
      console.error("Error updating pending message:", error);
      return false;
    }
  }

  /**
   * Update a pending message in the database to confirm
   * @param {String} pendingMessageID - ID of the pending message to update
   * @return {boolean} true if pending message updated successfully, false otherwise
   */
  async updatePendingMessageToConfirm(pendingMessageID) {
    try {
      if (!pendingMessageID) {
        console.error("Missing pending message ID to update to confirm.");
        return false;
      }
      // Update pending_message table
      await this.db.runAsync(
        `UPDATE pending_message SET jobType = 'confirm' WHERE id = ?;`,
        [pendingMessageID],
      );
      return true;
    } catch (error) {
      console.error("Error updating pending message to confirm:", error);
      return false;
    }
  }
}

export default Database;
