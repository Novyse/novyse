const adapter = require("expo-sqlite");

class Database {
  static instance = null;

  constructor(db) {
    this.db = db;
  }

  static async create() {
    if (!Database.instance) {
      const db = await adapter.openDatabaseAsync("novyse");
      if(!db) {
        throw new Error("Failed to open database");
      }
      Database.instance = new Database(db);
    }
    if (!(await Database.instance.exist())) {
      await Database.instance.initialize();
    }
    return Database.instance;
  }

  async initialize() {
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
                path TEXT NOT NULL UNIQUE,
                file_type TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS message (
                id INTEGER PRIMARY KEY,
                chatUUID TEXT NOT NULL,
                senderUUID TEXT NOT NULL,
                text TEXT,
                fileUUID TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_pinned BOOLEAN NOT NULL DEFAULT 0,
                replyToMessageUUID TEXT,
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (senderUUID) REFERENCES user(uuid),
                FOREIGN KEY (fileUUID) REFERENCES file(uuid),
                FOREIGN KEY (replyToMessageUUID) REFERENCES message(uuid)
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
    try {
      if (!this.db) {
        return false;
      }
      const result = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user';"
      );
      return result.length > 0;
    } catch (error) {
      console.error("Error checking database existence:", error);
      return false;
    }
  }

  async clear() {
    try {
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
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
          })
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
        ]
      );
      // Insert handle into the handle table
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO handle (userUUID, type, handle) VALUES (?, 'USER', ?);
      `,
        [user.uuid, user.handle]
      );
      console.log("User added successfully.");
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
          })
        );
        return false;
      }
      // Insert chat into the chat table
      await this.db.runAsync(
        `INSERT INTO chat (uuid, type, name, description, profilePictureUUID) VALUES (?, ?, ?, ?, ?);`,
        [
          chat.uuid,
          chat.type,
          chat.name || null,
          chat.description || null,
          chat.profilePictureUUID || null,
        ]
      );
      // If exist insert handle into the handle table
      if (chat.handle) {
        await this.db.runAsync(
          `INSERT INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?);`,
          [chat.uuid, chat.handle]
        );
      }
      // Insert members into the member table
      for (const member of chat.members) {
        await this.db.runAsync(
          `INSERT INTO member (userUUID, chatUUID) VALUES (?, ?);`,
          [member.uuid, chat.uuid]
        );
        // Insert member user info into the user table
        await this.addUserInfo(member);
      }
      return true;
    } catch (error) {
      console.error("Error adding chat:", error);
      return false;
    }
  }

  /**
   * Adds a message to the database.
   * @param {Object} message - Message object containing id, chatUUID, senderUUID, text, fileUUID, createdAt, isPinned, replyToMessageUUID
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
        console.error(
          "Missing required message fields:",
          JSON.stringify({
            id: message?.id,
            chatUUID: message?.chatUUID,
            senderUUID: message?.senderUUID,
          })
        );
        return false;
      }

      await this.db.runAsync(
        `INSERT INTO message (id, chatUUID, senderUUID, text, fileUUID, created_at, is_pinned, replyToMessageUUID) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.text || null,
          message.fileUUID || null,
          message.created_at,
          message.isPinned ? 1 : 0,
          message.replyToMessageUUID || null,
        ]
      );
      return true;
    } catch (error) {
      console.error("Error adding message:", error);
      return false;
    }
  }

  /**
   * Fetch all chats from the database.
   * @returns {Array} array of chat objects
   */

  async getChats() {
    try {
      const chats = await this.db.getAllAsync("SELECT * FROM chat;");
      console.log("Fetched chats:", chats);
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
      const message = await this.db.getFirstAsync(
        `SELECT m.*, u.name as sender_name FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ? ORDER BY m.created_at DESC LIMIT 1;`,
        [chatUUID]
      );
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
      const user = await this.db.getFirstAsync(
        `
        SELECT u.* FROM user u
        JOIN member m ON u.uuid = m.userUUID
        WHERE m.chatUUID = ?
        LIMIT 1;
      `,
        [chatUUID]
      );
      return user || null;
    } catch (error) {
      console.error("Error retrieving user by chat UUID:", error);
      return null;
    }
  }

  async getUserByUUID(userUUID) {
    try {
      const user = await this.db.getFirstAsync(
        `SELECT * FROM user WHERE uuid = ?;`,
        [userUUID]
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
            LIMIT 1;
        `);
      console.log("Local user from DB:", user);
      return user || null;
    } catch (error) {
      console.error("Error retrieving local user:", error);
      return null;
    }
  }

  async getMessagesByChatUUID(chatUUID) {
    try {
      const messages = await this.db.getAllAsync(
        `SELECT m.*, u.name as sender_name FROM message m
             JOIN user u ON m.senderUUID = u.uuid
             WHERE m.chatUUID = ?
                ORDER BY m.created_at ASC;`,
        [chatUUID]
      );
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
        [handle]
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
        [userUUID]
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
        [chatUUID]
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

  // - DEBUGGING ONLY
  async getAllInfoAllTableEverything() {
    try {
      const tables = await this.db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
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

export default Database;
