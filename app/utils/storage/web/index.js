import localforage from "localforage";

class Database {
  static instance = null;

  constructor() {
    // Configure localforage
    localforage.config({
      name: "novyse",
      storeName: "novyse_store",
    });
    this.store = localforage;
  }

  static async create() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    if (!(await Database.instance.exist())) {
      await Database.instance.initialize();
    }
    return Database.instance;
  }

  async initialize() {
    // Initialize default data structures if not exist
    const chatTypes = await this.store.getItem("chat_types");
    if (!chatTypes) {
      await this.store.setItem("chat_types", [
        { value: "DM", description: "Direct message between two users." },
        { value: "GROUP", description: "Group chat with multiple members." },
        { value: "CHANNEL", description: "Broadcast channel." },
        { value: "FORUM", description: "Discussion forum." },
      ]);
    }

    const handleTypes = await this.store.getItem("handle_types");
    if (!handleTypes) {
      await this.store.setItem("handle_types", [
        { value: "USER", description: "The handle refers to a user." },
        { value: "CHAT", description: "The handle refers to a chat." },
        { value: "BOT", description: "The handle refers to a bot." },
      ]);
    }

    // Initialize empty arrays for other data
    const users = (await this.store.getItem("users")) || [];
    await this.store.setItem("users", users);

    const chats = (await this.store.getItem("chats")) || [];
    await this.store.setItem("chats", chats);

    const members = (await this.store.getItem("members")) || [];
    await this.store.setItem("members", members);

    const files = (await this.store.getItem("files")) || [];
    await this.store.setItem("files", files);

    const messages = (await this.store.getItem("messages")) || [];
    await this.store.setItem("messages", messages);

    const handles = (await this.store.getItem("handles")) || [];
    await this.store.setItem("handles", handles);

    const bots = (await this.store.getItem("bots")) || [];
    await this.store.setItem("bots", bots);

    const pinnedChats = (await this.store.getItem("pinned_chats")) || [];
    await this.store.setItem("pinned_chats", pinnedChats);
  }

  async exist() {
    try {
      const users = await this.store.getItem("users");
      return Array.isArray(users);
    } catch (error) {
      console.error("Error checking database existence:", error);
      return false;
    }
  }

  async clear() {
    try {
      await this.store.clear();
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

      const users = (await this.store.getItem("users")) || [];
      const existingUser = users.find((u) => u.uuid === user.uuid);
      if (!existingUser) {
        users.push({
          uuid: user.uuid,
          email: user.email || null,
          name: user.name,
          surname: user.surname,
          profile_picture_uuid: user.profile_picture_uuid || null,
        });
        await this.store.setItem("users", users);
      }

      const handles = (await this.store.getItem("handles")) || [];
      const existingHandle = handles.find(
        (h) => h.handle === user.handle && h.type === "USER"
      );
      if (!existingHandle) {
        handles.push({
          user_uuid: user.uuid,
          type: "USER",
          handle: user.handle,
        });
        await this.store.setItem("handles", handles);
      }

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

      const chats = (await this.store.getItem("chats")) || [];
      chats.push({
        uuid: chat.uuid,
        type: chat.type,
        name: chat.name || null,
        description: chat.description || null,
        picture_uuid: chat.picture_uuid || null,
      });
      await this.store.setItem("chats", chats);

      if (chat.handle) {
        const handles = (await this.store.getItem("handles")) || [];
        handles.push({
          chat_uuid: chat.uuid,
          type: "CHAT",
          handle: chat.handle,
        });
        await this.store.setItem("handles", handles);
      }

      const members = (await this.store.getItem("members")) || [];
      for (const member of chat.members) {
        members.push({
          user_uuid: member.uuid,
          chat_uuid: chat.uuid,
        });
        await this.addUserInfo(member);
      }
      await this.store.setItem("members", members);

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

      const messages = (await this.store.getItem("messages")) || [];
      messages.push({
        id: message.id,
        chat_uuid: message.chatUUID,
        sender_uuid: message.senderUUID,
        text: message.text || null,
        file_uuid: message.fileUUID || null,
        created_at: message.createdAt,
        is_pinned: message.isPinned ? 1 : 0,
        reply_to_message_uuid: message.replyToMessageUUID || null,
      });
      await this.store.setItem("messages", messages);

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
      const chats = (await this.store.getItem("chats")) || [];
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
      const messages = (await this.store.getItem("messages")) || [];
      const users = (await this.store.getItem("users")) || [];
      const chatMessages = messages
        .filter((m) => m.chat_uuid === chatUUID)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (chatMessages.length > 0) {
        const lastMessage = chatMessages[0];
        const sender = users.find((u) => u.uuid === lastMessage.sender_uuid);
        return { ...lastMessage, sender_name: sender ? sender.name : null };
      }
      return null;
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
      const members = (await this.store.getItem("members")) || [];
      const users = (await this.store.getItem("users")) || [];
      const member = members.find((m) => m.chat_uuid === chatUUID);
      if (member) {
        return users.find((u) => u.uuid === member.user_uuid) || null;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving user by chat UUID:", error);
      return null;
    }
  }

  async getUserByUUID(userUUID) {
    try {
      const users = (await this.store.getItem("users")) || [];
      return users.find((u) => u.uuid === userUUID) || null;
    } catch (error) {
      console.error("Error retrieving user by UUID:", error);
      return null;
    }
  }

  async getLocalUser() {
    try {
      const users = (await this.store.getItem("users")) || [];
      const handles = (await this.store.getItem("handles")) || [];
      if (users.length > 0) {
        const user = users[0];
        const handle = handles.find(
          (h) => h.user_uuid === user.uuid && h.type === "USER"
        );
        return { ...user, handle: handle ? handle.handle : null };
      }
      return null;
    } catch (error) {
      console.error("Error retrieving local user:", error);
      return null;
    }
  }

  async getMessagesByChatUUID(chatUUID) {
    try {
      const messages = (await this.store.getItem("messages")) || [];
      const users = (await this.store.getItem("users")) || [];
      const chatMessages = messages
        .filter((m) => m.chat_uuid === chatUUID)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((m) => {
          const sender = users.find((u) => u.uuid === m.sender_uuid);
          return { ...m, sender_name: sender ? sender.name : null };
        });
      return chatMessages;
    } catch (error) {
      console.error("Error retrieving messages by chat UUID:", error);
      return [];
    }
  }

  async getUUIDByHandle(handle) {
    try {
      const handles = (await this.store.getItem("handles")) || [];
      const found = handles.find((h) => h.handle === handle);
      if (found) {
        return {
          uuid: found.user_uuid || found.chat_uuid || found.bot_uuid || null,
          type: found.type,
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
      const chats = (await this.store.getItem("chats")) || [];
      const members = (await this.store.getItem("members")) || [];
      const userMembers = members.filter((m) => m.user_uuid === userUUID);
      const dmChats = chats.filter(
        (c) =>
          c.type === "DM" && userMembers.some((m) => m.chat_uuid === c.uuid)
      );
      return dmChats.length > 0 ? dmChats[0] : null;
    } catch (error) {
      console.error("Error retrieving chat from user UUID:", error);
      return null;
    }
  }

  async getChatByUUID(chatUUID) {
    try {
      const chats = (await this.store.getItem("chats")) || [];
      return chats.find((c) => c.uuid === chatUUID) || null;
    } catch (error) {
      console.error("Error retrieving chat by UUID:", error);
      return null;
    }
  }

  // - DEBUGGING ONLY
  async getAllInfoAllTableEverything() {
    try {
      const keys = await this.store.keys();
      const result = {};
      for (const key of keys) {
        result[key] = await this.store.getItem(key);
      }
      return result;
    } catch (error) {
      console.error("Error retrieving all data:", error);
      return null;
    }
  }
}

export default Database;
