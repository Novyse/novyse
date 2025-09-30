const adapter = require("expo-sqlite");

class Database {
  static instance = null;

  constructor(db) {
    this.db = db;
  }

  static async create() {
    if (!Database.instance) {
      const db = await adapter.openDatabaseAsync("novyse", {
        useNewConnection: true,
      });
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
                type TEXT NOT NULL DEFAULT 'text',
                fileUUID TEXT,
                system_action TEXT,
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
          })
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
        ]
      );
      // If exist insert handle into the handle table
      if (chat.handle) {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?);`,
          [chat.uuid, chat.handle]
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
        console.error("Missing required message fields:", message);
        return false;
      }

      await this.db.runAsync(
        `INSERT OR IGNORE INTO message (id, chatUUID, senderUUID, text, type, fileUUID, system_action, created_at, is_pinned, replyToMessageUUID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          message.id,
          message.chatUUID,
          message.senderUUID,
          message.text || null,
          message.type || "text",
          message.fileUUID || null,
          message.system_action || null,
          message.created_at,
          message.isPinned ? 1 : 0,
          message.replyToMessageUUID || null,
        ]
      );
      console.log("Message added or already exists (ignored).", message.id);
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
      const members = await this.db.getAllAsync(
        `SELECT userUUID FROM member WHERE chatUUID = ?;`,
        [chatUUID]
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
          (m) => m.userUUID !== localUser.uuid
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

  async addMember(chatUUID, user) {
    try {
      if (!chatUUID || !user || !user.uuid) {
        console.error(
          "Missing required fields to add member:",
          JSON.stringify({ chatUUID, user: user ? user.uuid : null })
        );
        return false;
      }
      // Insert member into the member table
      await this.db.runAsync(
        `INSERT OR IGNORE INTO member (userUUID, chatUUID) VALUES (?, ?);`,
        [user.uuid, chatUUID]
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
