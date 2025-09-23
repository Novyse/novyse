const adapter = require("expo-sqlite");

class Database {
  static instance = null;

  constructor(db) {
    this.db = db;
  }

  static async create() {
    if (!Database.instance) {
      const db = await adapter.openDatabaseAsync("novyse.sqlite");
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
                profile_picture_uuid TEXT
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
                picture_uuid TEXT,
                FOREIGN KEY (type) REFERENCES chat_type(value)
            );

            CREATE TABLE IF NOT EXISTS member (
                user_uuid TEXT NOT NULL,
                chat_uuid TEXT NOT NULL,
                PRIMARY KEY (user_uuid, chat_uuid),
                FOREIGN KEY (user_uuid) REFERENCES user(uuid),
                FOREIGN KEY (chat_uuid) REFERENCES chat(uuid)
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
                chat_uuid TEXT NOT NULL,
                sender_uuid TEXT NOT NULL,
                content TEXT,
                file_uuid TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_pinned BOOLEAN NOT NULL DEFAULT 0,
                reply_to_message_uuid TEXT,
                FOREIGN KEY (chat_uuid) REFERENCES chat(uuid),
                FOREIGN KEY (sender_uuid) REFERENCES user(uuid),
                FOREIGN KEY (file_uuid) REFERENCES file(uuid),
                FOREIGN KEY (reply_to_message_uuid) REFERENCES message(uuid)
            );

            
            CREATE TABLE IF NOT EXISTS handle (
                user_uuid TEXT NULL,
                chat_uuid TEXT NULL,
                bot_uuid TEXT NULL,
                type TEXT NOT NULL,
                handle TEXT NOT NULL,
                CONSTRAINT handle_pkey PRIMARY KEY (handle),
                CONSTRAINT handle_handle_key UNIQUE (handle),
                FOREIGN KEY (user_uuid) REFERENCES user(uuid),
                FOREIGN KEY (chat_uuid) REFERENCES chat(uuid),
                FOREIGN KEY (bot_uuid) REFERENCES bot(uuid),
                FOREIGN KEY (type) REFERENCES handle_type(value)
            );

            CREATE TABLE IF NOT EXISTS bot (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                profile_picture_uuid TEXT,
                FOREIGN KEY (profile_picture_uuid) REFERENCES file(uuid)
            );

            CREATE TABLE IF NOT EXISTS pinned_chat (
                user_uuid TEXT NOT NULL,
                chat_uuid TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (user_uuid, chat_uuid),
                FOREIGN KEY (user_uuid) REFERENCES user(uuid),
                FOREIGN KEY (chat_uuid) REFERENCES chat(uuid)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_message_chat_uuid ON message(chat_uuid);
            CREATE INDEX IF NOT EXISTS idx_message_sender_uuid ON message(sender_uuid);
            CREATE INDEX IF NOT EXISTS idx_member_chat_uuid ON member(chat_uuid);
`);
  }

  async exist() {
    try {
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
        INSERT OR IGNORE INTO user (uuid, email, name, surname, profile_picture_uuid) VALUES (?, ?, ?, ?, ?);
      `,
        [
          user.uuid,
          user.email || null,
          user.name,
          user.surname,
          user.profile_picture_uuid || null,
        ]
      );
      // Insert handle into the handle table
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO handle (user_uuid, type, handle) VALUES (?, 'USER', ?);
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
        `INSERT INTO chat (uuid, type, name, description, picture_uuid) VALUES (?, ?, ?, ?, ?);`,
        [
          chat.uuid,
          chat.type,
          chat.name || null,
          chat.description || null,
          chat.picture_uuid || null,
        ]
      );
      // If exist insert handle into the handle table
      if (chat.handle) {
        await this.db.runAsync(
          `INSERT INTO handle (chat_uuid, type, handle) VALUES (?, 'CHAT', ?);`,
          [chat.uuid, chat.handle]
        );
      }
      // Insert members into the member table
      for (const member of chat.members) {
        await this.db.runAsync(
          `INSERT INTO member (user_uuid, chat_uuid) VALUES (?, ?);`,
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
   * @param {Object} message - Message object containing id, chatUUID, senderUUID, content, fileUUID, createdAt, isPinned, replyToMessageUUID
   * @returns {boolean} true if message added successfully, false otherwise
   */
  async addMessage(message) {
    try {
      if (
        !message ||
        message.id === undefined ||
        !message.chatUUID ||
        !message.senderUUID
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
        `INSERT INTO message (id, chat_uuid, sender_uuid, content, file_uuid, created_at, is_pinned, reply_to_message_uuid) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.content || null,
          message.fileUUID || null,
          message.createdAt,
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
             JOIN user u ON m.sender_uuid = u.uuid
             WHERE m.chat_uuid = ? ORDER BY m.created_at DESC LIMIT 1;`,
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
        JOIN member m ON u.uuid = m.user_uuid
        WHERE m.chat_uuid = ?
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
            LEFT JOIN handle h ON u.uuid = h.user_uuid AND h.type = 'USER'
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
             JOIN user u ON m.sender_uuid = u.uuid
             WHERE m.chat_uuid = ?
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
        `SELECT user_uuid, chat_uuid, bot_uuid, type FROM handle WHERE handle = ?;`,
        [handle]
      );
      if (row) {
        return {
          uuid: row.user_uuid || row.chat_uuid || row.bot_uuid || null,
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
            JOIN member m ON c.uuid = m.chat_uuid
            WHERE m.user_uuid = ? AND c.type = 'DM'
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
