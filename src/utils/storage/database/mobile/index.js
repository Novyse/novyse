const adapter = require("expo-sqlite");

import { useSQLiteContext } from "expo-sqlite";

class Database {
  static instance = null;

  constructor(db) {
    this.db = db;
  }

  static async create() {
    if (!Database.instance) {
      if (!db) {
        throw new Error("Failed to open database");
      }
      Database.instance = new Database(db);
    }
    if (!(await Database.instance.exist())) {
      await Database.instance.initialize();
    }
    return Database.instance;
  }

  static async createDb() {
    const db = await adapter.openDatabaseAsync("novyse", {
      useNewConnection: true,
    });
    return new Database(db);
  }

  async addDb() {
    return;
    const db = useSQLiteContext();
    this.db = db;
    return;
    const dba = await adapter.openDatabaseAsync("novyse", {
      useNewConnection: true,
    });
    this.db = db;
  }

  setDb(db) {
    this.db = db;
  }

  async initialize() {
    await this.addDb();
    return await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS chat_type (
                value TEXT PRIMARY KEY,
                description TEXT NOT NULL
            );

            INSERT OR IGNORE INTO chat_type (value, description)
            VALUES
                ('DM', 'Direct message between two users.'),
                ('GROUP', 'Group chat with multiple members.'),
                ('CHANNEL', 'Broadcast channel.'),
                ('FORUM', 'Discussion forum.');

            CREATE TABLE IF NOT EXISTS user (
                uuid TEXT PRIMARY KEY,
                email TEXT,
                name TEXT NOT NULL,
                surname TEXT NOT NULL,
                profilePictureUUID TEXT
            );

            -- Insert system user for system messages
            INSERT OR IGNORE INTO user (uuid, name, surname)
            VALUES ('00000000-0000-0000-0000-000000000000', 'System', '');

            CREATE TABLE IF NOT EXISTS handle_type (
                value TEXT PRIMARY KEY,
                description TEXT NOT NULL
            );

            INSERT OR IGNORE INTO
                handle_type (value, description)
            VALUES (
                    'USER',
                    'The handle refers to a user.'
                ),
                (
                    'CHAT',
                    'The handle refers to a chat.'
                ),
                (
                    'BOT',
                    'The handle refers to a bot.'
                );

            CREATE TABLE IF NOT EXISTS chat (
                uuid TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT,
                description TEXT,
                profilePictureUUID TEXT,
                FOREIGN KEY (type) REFERENCES chat_type(value)
            );

            CREATE TABLE IF NOT EXISTS member (
                userUUID TEXT NOT NULL,
                chatUUID TEXT NOT NULL,
                PRIMARY KEY (userUUID, chatUUID),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
            );

            CREATE TABLE IF NOT EXISTS file (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ref TEXT,
                mimeType TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                duration INTEGER DEFAULT 0,
                waveform TEXT
            );

            CREATE TABLE IF NOT EXISTS message (
                id INTEGER NOT NULL,
                chatUUID TEXT NOT NULL,
                senderUUID TEXT NOT NULL,
                content TEXT,
                type TEXT NOT NULL DEFAULT 'message',
                system_action TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_pinned BOOLEAN NOT NULL DEFAULT 0,
                PRIMARY KEY (chatUUID, id),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (senderUUID) REFERENCES user(uuid)
            );

            CREATE TABLE IF NOT EXISTS message_files (
                chatUUID TEXT NOT NULL,
                messageID INTEGER NOT NULL,
                fileUUID TEXT NOT NULL,
                PRIMARY KEY (chatUUID, messageID, fileUUID),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (messageID) REFERENCES message(id),
                FOREIGN KEY (fileUUID) REFERENCES file(uuid)
            );

            CREATE TABLE IF NOT EXISTS pending_message (
                id TEXT NOT NULL,
                jobType TEXT NOT NULL,
                chatUUID TEXT,
                senderUUID TEXT,
                content TEXT,
                type TEXT,
                PRIMARY KEY (id),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (senderUUID) REFERENCES user(uuid)
            );

            CREATE TABLE IF NOT EXISTS pending_file (
                "index" INTEGER NOT NULL,
                pendingMessageID TEXT NOT NULL,
                uri TEXT,
                ref TEXT,
                mimeType TEXT NOT NULL,
                uuid TEXT,
                s3Url TEXT,
                PRIMARY KEY ("index", pendingMessageID),
                FOREIGN KEY (pendingMessageID) REFERENCES pending_message(id)
            );

            CREATE TABLE IF NOT EXISTS bot (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                profilePictureUUID TEXT,
                FOREIGN KEY (profilePictureUUID) REFERENCES file(uuid)
            );

            
            CREATE TABLE IF NOT EXISTS handle (
                userUUID TEXT NULL,
                chatUUID TEXT NULL,
                botUUID TEXT NULL,
                type TEXT NOT NULL,
                handle TEXT NOT NULL,
                CONSTRAINT handle_pkey PRIMARY KEY (handle),
                CONSTRAINT handle_handle_key UNIQUE (handle),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (botUUID) REFERENCES bot(uuid),
                FOREIGN KEY (type) REFERENCES handle_type(value)
            );

            CREATE TABLE IF NOT EXISTS pinned_chat (
                userUUID TEXT NOT NULL,
                chatUUID TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (userUUID, chatUUID),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_message_chatUUID ON message(chatUUID);
            CREATE INDEX IF NOT EXISTS idx_message_senderUUID ON message(senderUUID);
            CREATE INDEX IF NOT EXISTS idx_member_chatUUID ON member(chatUUID);
`);
  }

  async exist() {
    await this.addDb();
    try {
      if (!this.db) {
        return false;
      }
      const result = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user';",
      );
      return result.length > 0;
    } catch (error) {
      console.error("Error checking database existence:", error);
      return false;
    }
  }

  async clear() {
    await this.addDb();
    try {
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      );
      const dropStatements = tables
        .map((table) => `DROP TABLE IF EXISTS ${table.name};`)
        .join(" ");
      if (dropStatements) {
        await this.db.execAsync(dropStatements);
      }
      console.log("Database cleared successfully.");
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  }

  /**
   * Adds a user to the database.
   * @param {Object} user - User object containing uuid, email, name, surname, profilePictureUuid, handle
   * @returns {boolean} true if user added successfully, false otherwise
   */
  async addUserInfo(user) {
    try {
      if (!user || !user.uuid || !user.name || !user.surname || !user.handle) {
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
        INSERT OR IGNORE INTO user (uuid, email, name, surname, profilePictureUUID) VALUES (?, ?, ?, ?, ?);
      `,
        [
          user.uuid,
          user.email || null,
          user.name,
          user.surname,
          user.profilePictureUUID || null,
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
   * Adds a chat to the database.
   * @param {Object} chat - Chat object containing uuid, type, name, handle, description, pictureUuid, members (array of user UUIDs)
   * @returns {boolean} true if chat added successfully, false otherwise
   */

  async addChat(chat) {
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
      // Insert chat into the chat table
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
      // If exist insert handle into the handle table
      if (chat.handle) {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?);`,
          [chat.uuid, chat.handle],
        );
      }
      // Insert members into the member table
      for (const member of chat.members) {
        await this.addMember(chat.uuid, member);
      }
      return true;
    } catch (error) {
      console.error("Error adding chat:", error);
      return false;
    }
  }

  /**
   * Adds a message to the database.
   * @param {Object} message - Message object containing id, chatUUID, senderUUID, content, fileUUID, createdAt, isPinned,
   * @returns {boolean} true if message added successfully, false otherwise
   */
  async addMessage(message) {
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
        `INSERT OR IGNORE INTO message (id, chatUUID, senderUUID, content, type, system_action, created_at, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.content || null,
          message.type || "message",
          message.system_action || null,
          message.created_at,
          message.isPinned ? 1 : 0,
        ],
      );

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

      console.log("Message added or already exists.", message.id);
      return true;
    } catch (error) {
      console.error("Error adding message:", error, message);
      return false;
    }
  }

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
        `INSERT OR IGNORE INTO pending_message (id, jobType, chatUUID, senderUUID, content, type) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          pendingMessage.id,
          pendingMessage.jobType,
          pendingMessage.chatUUID,
          pendingMessage.senderUUID,
          pendingMessage.content || null,
          pendingMessage.type || "message",
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

  /**
   * Fetch all chats from the database.
   * @returns {Array} array of chat objects
   */

  async getChats() {
    await this.addDb();
    try {
      const chats = await this.db.getAllAsync("SELECT * FROM chat;");
      return chats;
    } catch (error) {
      console.error("Error retrieving chats:", error);
      return [];
    }
  }

  /**
   * Get the last message for a given chat.
   * @param {String} chatUUID
   * @returns {Object|null} last message object or null if not found + sender name
   */

  async getLastMessage(chatUUID) {
    try {
      const pendingMessages = await this.getPendingMessagesByChatUUID(chatUUID);
      if (pendingMessages.length > 0) {
        // Return the most recent pending message
        return pendingMessages[pendingMessages.length - 1];
      }
      const message = await this.db.getFirstAsync(
        `SELECT m.*, u.name as sender_name FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ? ORDER BY m.created_at DESC LIMIT 1;`,
        [chatUUID],
      );
      if (message) {
        // Retrieve associated files with mime types
        const files = await this.db.getAllAsync(
          `SELECT f.uuid, f.mimeType, f.name FROM file f
           JOIN message_files mf ON f.uuid = mf.fileUUID
           WHERE mf.chatUUID = ? AND mf.messageID = ?;`,
          [chatUUID, message.id],
        );
        message.files = files;
      }
      return message || null;
    } catch (error) {
      console.error("Error retrieving last message:", error);
      return null;
    }
  }

  /**
   * Get user by chat UUID (ONLY for DMs)
   * @param {String} chatUUID
   * @returns {Object|null} user object or null if not found
   */

  async getUserByChatUUID(chatUUID) {
    try {
      const members = await this.db.getAllAsync(
        `SELECT userUUID FROM member WHERE chatUUID = ?;`,
        [chatUUID],
      );
      if (members.length === 1) {
        // Return the single user
        const user = await this.getUserByUUID(members[0].userUUID);
        return user;
      } else if (members.length === 2) {
        const localUser = await this.getLocalUser();
        if (!localUser || !localUser.uuid) {
          console.error("Local user not found");
          return null;
        }
        // Return the user that is not the local user
        const otherUserUUID = members.find(
          (m) => m.userUUID !== localUser.uuid,
        )?.userUUID;
        if (otherUserUUID) {
          const user = await this.getUserByUUID(otherUserUUID);
          return user;
        }
        return null;
      } else {
        // More than 2 or 0 members, return null
        return null;
      }
    } catch (error) {
      console.error("Error retrieving user by chat UUID:", error);
      return null;
    }
  }

  async getUserByUUID(userUUID) {
    try {
      const user = await this.db.getFirstAsync(
        `SELECT * FROM user WHERE uuid = ?;`,
        [userUUID],
      );
      return user || null;
    } catch (error) {
      console.error("Error retrieving user by UUID:", error);
      return null;
    }
  }

  async getLocalUser() {
    try {
      const user = await this.db.getFirstAsync(`
            SELECT u.*, h.handle FROM user u
            LEFT JOIN handle h ON u.uuid = h.userUUID AND h.type = 'USER'
            WHERE u.email IS NOT NULL AND u.email != ''
            LIMIT 1;
        `);
      return user || null;
    } catch (error) {
      console.error("Error retrieving local user:", error);
      return null;
    }
  }

  async getMessagesByChatUUID(chatUUID) {
    await this.addDb();
    try {
      const messages = await this.db.getAllAsync(
        `SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ?
                ORDER BY m.created_at ASC;`,
        [chatUUID],
      );
      // Add files to each message
      for (const message of messages) {
        const files = await this.db.getAllAsync(
          `SELECT f.* FROM file f
         JOIN message_files mf ON f.uuid = mf.fileUUID
         WHERE mf.chatUUID = ? AND mf.messageID = ?;`,
          [chatUUID, message.id],
        );
        message.files = files;
      }
      return messages;
    } catch (error) {
      console.error("Error retrieving messages by chat UUID:", error);
      return [];
    }
  }

  async getUUIDByHandle(handle) {
    try {
      const row = await this.db.getFirstAsync(
        `SELECT userUUID, chatUUID, botUUID, type FROM handle WHERE handle = ?;`,
        [handle],
      );
      if (row) {
        return {
          uuid: row.userUUID || row.chatUUID || row.botUUID || null,
          type: row.type,
        };
      }
      return null;
    } catch (error) {
      console.error("Error retrieving UUID by handle:", error);
      return null;
    }
  }

  async getChatFromUserUUID(userUUID) {
    try {
      const chat = await this.db.getFirstAsync(
        `
            SELECT c.* FROM chat c
            JOIN member m ON c.uuid = m.chatUUID
            WHERE m.userUUID = ? AND c.type = 'DM'
            LIMIT 1;
        `,
        [userUUID],
      );
      return chat || null;
    } catch (error) {
      console.error("Error retrieving chat from user UUID:", error);
      return null;
    }
  }

  async getChatByUUID(chatUUID) {
    try {
      const chat = await this.db.getFirstAsync(
        `SELECT * FROM chat WHERE uuid = ?;`,
        [chatUUID],
      );
      return chat || null;
    } catch (error) {
      console.error("Error retrieving chat by UUID:", error);
      return null;
    }
  }

  async addSenderNameToMessage(message) {
    try {
      if (!message || !message.senderUUID) {
        return message;
      }
      const user = await this.getUserByUUID(message.senderUUID);
      if (user) {
        return { ...message, sender_name: user.name };
      }
      return message;
    } catch (error) {
      console.error("Error adding sender name to message:", error);
      return message;
    }
  }

  async addMember(chatUUID, user) {
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
        `INSERT OR IGNORE INTO member (userUUID, chatUUID) VALUES (?, ?);`,
        [user.uuid, chatUUID],
      );
      // Insert member user info into the user table
      await this.addUserInfo(user);
      console.log(`User ${user.uuid} added to chat ${chatUUID} successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding member to chat:", error);
      return false;
    }
  }
  message = {
    /**
     * Add multiple messages to the database in a single query.
     * @param {Array} messages - Array of message objects to add
     * @returns {boolean} true if messages added successfully, false otherwise
     */
    addMultiple: async (messages) => {
      try {
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          console.error("No messages to add.");
          return false;
        }
        const placeholders = messages
          .map(
            () => `(?, ?, ?, ?, ?, ?, ?, ?)`, // 8 placeholders for each message field
          )
          .join(", ");
        const values = [];
        for (const message of messages) {
          if (
            message.id === undefined ||
            !message.chatUUID ||
            !message.senderUUID ||
            !message.created_at
          ) {
            console.error("Missing required message fields:", message);
            continue; // Skip this message and continue with the next one
          }
          values.push(
            message.id,
            message.chatUUID,
            message.senderUUID,
            message.content || null,
            message.type || "message",
            message.system_action || null,
            message.created_at,
            message.isPinned ? 1 : 0,
          );
        }
        await this.db.runAsync(
          `INSERT OR IGNORE INTO message (id, chatUUID, senderUUID, content, type, system_action, created_at, is_pinned) VALUES ${placeholders};`,
          values,
        );
        console.log(`${messages.length} messages added successfully.`);

        // Now add files for each message
        const allFiles = [];
        const allMessageFiles = [];
        for (const message of messages) {
          if (message.files && Array.isArray(message.files)) {
            for (const file of message.files) {
              if (!file.uuid || !file.name || !file.mimeType || file.size === undefined) {
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
          const fileValues = [];
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
          console.log(`${allFiles.length} files added successfully.`);
        }
        if (allMessageFiles.length > 0) {
          const mfPlaceholders = allMessageFiles
            .map(() => `(?, ?, ?)`)
            .join(", ");
          const mfValues = [];
          for (const mf of allMessageFiles) {
            mfValues.push(mf.chatUUID, mf.messageID, mf.fileUUID);
          }
          await this.db.runAsync(
            `INSERT OR IGNORE INTO message_files (chatUUID, messageID, fileUUID) VALUES ${mfPlaceholders};`,
            mfValues,
          );
          console.log(`${allMessageFiles.length} message-file associations added successfully.`);
        }
        return true;
      } catch (error) {
        console.error("Error adding multiple messages:", error);
        return false;
      }
    },
  };
  user = {
    profile: {
      picture: {
        get: async (userUUID) => {
          try {
            const user = await this.db.getFirstAsync(
              `SELECT profilePictureUUID FROM user WHERE uuid = ?;`,
              [userUUID],
            );
            return user ? user.profilePictureUUID : null;
          } catch (error) {
            console.error("Error retrieving user profile picture:", error);
            return null;
          }
        },
        set: async (userUUID, pictureUUID) => {
          try {
            if (!userUUID || !pictureUUID) {
              console.error(
                "Missing required fields to set user profile picture.",
              );
              return false;
            }
            const result = await this.db.runAsync(
              `UPDATE user SET profilePictureUUID = ? WHERE uuid = ?;`,
              [pictureUUID, userUUID],
            );
            if (result.changes > 0) {
              console.log(
                "User profile picture updated successfully:",
                userUUID,
              );
              return true;
            }
            return false;
          } catch (error) {
            console.error("Error updating user profile picture:", error);
            return false;
          }
        },
      },
    },
  };
  user = {
    get: {
      /**
       * Get user info by UUID.
       * @param {String} userUUID
       * @returns {Object} user object or null if not found
       */
      byUUID: async (userUUID) => {
        await this.addDb();
        try {
          const user = await this.db.getFirstAsync(
            `SELECT * FROM user WHERE uuid = ?;`,
            [userUUID],
          );
          if (user) {
            const handleRow = await this.db.getFirstAsync(
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
       * Get user info by handle.
       * @param {String} handle @returns {Object} user object or null if not found
       */
      byHandle: async (handle) => {
        try {
          const row = await this.db.getFirstAsync(
            `SELECT userUUID FROM handle WHERE handle = ? AND type = 'USER';`,
            [handle],
          );
          if (row && row.userUUID) {
            const user = await this.db.getFirstAsync(
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

      profile: {
        picture: {
          /**
           * Update user profile picture UUID.
           * @param {String} userUUID
           * @param {String} profilePictureUUID
           * @returns {boolean} true if profile picture updated successfully, false otherwise
           */

          update: async (userUUID, profilePictureUUID) => {
            try {
              if (!userUUID || !profilePictureUUID) {
                console.error(
                  "Missing required fields to update user profile picture.",
                );
                return false;
              }
              const result = await this.db.runAsync(
                `UPDATE user SET profilePictureUUID = ? WHERE uuid = ?;`,
                [profilePictureUUID, userUUID],
              );
              if (result.changes > 0) {
                console.log(
                  "User profile picture updated successfully:",
                  userUUID,
                );
                return true;
              }
              return false;
            } catch (error) {
              console.error("Error updating user profile picture:", error);
              return false;
            }
          },
        },
      },
    },
  };
  file = {
    get: {
      /**
       * Get file info by UUID.
       * @param {String} fileUUID
       * @returns {String} file ref or null if not found
       */
      ref: async (fileUUID) => {
        try {
          const file = await this.db.getFirstAsync(
            `SELECT ref FROM file WHERE uuid = ?;`,
            [fileUUID],
          );
          return file ? file.ref : null;
        } catch (error) {
          console.error("Error retrieving file ref:", error);
          return null;
        }
      },
      /**
       * Get total size of all files in the database.
       * @returns {Number} total size in bytes
       */
      totalSize: async () => {
        try {
          const result = await this.db.getFirstAsync(
            `SELECT SUM(size) as totalSize FROM file;`,
          );
          return result ? result.totalSize : 0;
        } catch (error) {
          console.error("Error calculating total file size:", error);
          return 0;
        }
      },
    },
    update: {
      /**
       * Update the ref of a file in the database.
       * @param {String} fileUUID
       * @param {String} newRef
       * @returns {boolean} true if file ref updated successfully, false otherwise
       */
      ref: async (fileUUID, newRef) => {
        try {
          if (!fileUUID || !newRef) {
            console.error("Missing required fields to update file ref.");
            return false;
          }
          const result = await this.db.runAsync(
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
      /**
       * Update the waveform of a file in the database.
       * @param {String} fileUUID
       * @param {Array} newWaveform
       */
      waveform: async (fileUUID, newWaveform) => {
        try {
          if (!fileUUID || !newWaveform) {
            console.error("Missing required fields to update file waveform.");
            return false;
          }
          const result = await this.db.runAsync(
            `UPDATE file SET waveform = ? WHERE uuid = ?;`,
            [JSON.stringify(newWaveform), fileUUID],
          );
          if (result.changes > 0) {
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating file waveform:", error);
          return false;
        }
      },
      /**
       * Update the duration of a file in the database.
       * @param {String} fileUUID
       * @param {Number} newDuration
       */
      duration: async (fileUUID, newDuration) => {
        try {
          if (!fileUUID || newDuration === undefined || newDuration === null) {
            console.error("Missing required fields to update file duration.");
            return false;
          }
          const result = await this.db.runAsync(
            `UPDATE file SET duration = ? WHERE uuid = ?;`,
            [newDuration, fileUUID],
          );
          if (result.changes > 0) {
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating file duration:", error);
          return false;
        }
      },
    },
    /**
     * Add a new file to the database.
     * @param {String} uuid
     * @param {String} name
     * @param {String} mimeType
     * @param {String} size
     * @returns {boolean} true if file added successfully, false otherwise
     */
    add: async (uuid, name, mimeType, size) => {
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

  // - DEBUGGING ONLY
  async getAllInfoAllTableEverything() {
    try {
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      );
      const result = {};
      for (const table of tables) {
        const rows = await this.db.getAllAsync(`SELECT * FROM ${table.name};`);
        result[table.name] = rows;
      }
      return result;
    } catch (error) {
      console.error("Error retrieving all data:", error);
      return null;
    }
  }
}

const database = new Database();
export default database;
