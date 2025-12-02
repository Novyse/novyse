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

    const message_files = (await this.store.getItem("message_files")) || [];
    await this.store.setItem("message_files", message_files);

    const pending_messages =
      (await this.store.getItem("pending_messages")) || [];
    await this.store.setItem("pending_messages", pending_messages);

    const pending_files = (await this.store.getItem("pending_files")) || [];
    await this.store.setItem("pending_files", pending_files);

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
          profilePictureUUID: user.profilePictureUUID || null,
        });
        await this.store.setItem("users", users);
      }

      const handles = (await this.store.getItem("handles")) || [];
      const existingHandle = handles.find(
        (h) => h.handle === user.handle && h.type === "USER"
      );
      if (!existingHandle) {
        handles.push({
          userUUID: user.uuid,
          type: "USER",
          handle: user.handle,
        });
        await this.store.setItem("handles", handles);
      }

      console.log("User added successfully.", user);
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
      const existingChat = chats.find((c) => c.uuid === chat.uuid);
      if (!existingChat) {
        chats.push({
          uuid: chat.uuid,
          type: chat.type,
          name: chat.name || null,
          description: chat.description || null,
          profilePictureUUID: chat.profilePictureUUID || null,
        });
        await this.store.setItem("chats", chats);
      }

      if (chat.handle) {
        const handles = (await this.store.getItem("handles")) || [];
        const existingHandle = handles.find(
          (h) => h.chatUUID === chat.uuid && h.type === "CHAT"
        );
        if (!existingHandle) {
          handles.push({
            chatUUID: chat.uuid,
            type: "CHAT",
            handle: chat.handle,
          });
          await this.store.setItem("handles", handles);
        }
      }

      for (const member of chat.members) {
        await this.addMember(chat.uuid, member);
      }

      console.log("Chat added successfully.", chat.uuid);
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
        !message.senderUUID ||
        !message.created_at
      ) {
        console.error("Missing required message fields:", message);
        return false;
      }

      const messages = (await this.store.getItem("messages")) || [];

      // Check for duplicate message by ID and chatUUID to prevent adding the same message multiple times
      const existingMessage = messages.find(
        (m) => m.id === message.id && m.chatUUID === message.chatUUID
      );
      if (existingMessage) {
        console.log("Message already exists, skipping addition:", message.id);
        return true; // Treat as success since it's already there
      }

      messages.push({
        id: message.id,
        chatUUID: message.chatUUID,
        senderUUID: message.senderUUID,
        content: message.content || null,
        type: message.type || "message",
        system_action: message.system_action || null,
        created_at: message.created_at,
        is_pinned: message.is_pinned ? 1 : 0,
        replyToMessageUUID: message.replyToMessageUUID || null,
      });
      await this.store.setItem("messages", messages);

      console.log("Message added successfully.", message.id);

      return true;
    } catch (error) {
      console.error("Error adding message:", error);
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
          })
        );
        return false;
      }
      const pending_messages =
        (await this.store.getItem("pending_messages")) || [];
      const existingPending = pending_messages.find(
        (pm) => pm.id === pendingMessage.id
      );
      if (!existingPending) {
        pending_messages.push({
          id: pendingMessage.id,
          jobType: pendingMessage.jobType,
          chatUUID: pendingMessage.chatUUID,
          senderUUID: pendingMessage.senderUUID,
          content: pendingMessage.content || null,
          type: pendingMessage.type || "message",
        });
        await this.store.setItem("pending_messages", pending_messages);

        // Insert files into pending_files
        if (pendingMessage.files && Array.isArray(pendingMessage.files)) {
          const pending_files =
            (await this.store.getItem("pending_files")) || [];
          for (let i = 0; i < pendingMessage.files.length; i++) {
            const file = pendingMessage.files[i];
            pending_files.push({
              index: i,
              pendingMessageID: pendingMessage.id,
              uri: file.uri,
              mimeType: file.mimeType,
            });
          }
          await this.store.setItem("pending_files", pending_files);
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
      const pending_messages =
        (await this.store.getItem("pending_messages")) || [];
      const index = pending_messages.findIndex(
        (pm) => pm.id === pendingMessageID
      );
      if (index !== -1) {
        pending_messages.splice(index, 1);
        await this.store.setItem("pending_messages", pending_messages);

        // Remove associated files from pending_files
        const pending_files = (await this.store.getItem("pending_files")) || [];
        const filteredFiles = pending_files.filter(
          (pf) => pf.pendingMessageID !== pendingMessageID
        );
        await this.store.setItem("pending_files", filteredFiles);

        console.log(
          `Pending message ${pendingMessageID} and associated files removed successfully.`
        );
        return true;
      }
      console.log(
        `Pending message ${pendingMessageID} not found. No action taken.`
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
      const pending_messages =
        (await this.store.getItem("pending_messages")) || [];
      const pending_files = (await this.store.getItem("pending_files")) || [];
      for (const message of pending_messages) {
        const files = pending_files.filter(
          (pf) => pf.pendingMessageID === message.id
        );
        message.files = files;
      }
      return pending_messages;
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
      const pending_messages =
        (await this.store.getItem("pending_messages")) || [];
      const chatPendingMessages = pending_messages.filter(
        (pm) => pm.chatUUID === chatUUID
      );
      const pending_files = (await this.store.getItem("pending_files")) || [];
      for (const message of chatPendingMessages) {
        const files = pending_files.filter(
          (pf) => pf.pendingMessageID === message.id
        );
        message.files = files;
      }
      return chatPendingMessages;
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
    files
  ) {
    try {
      if (!pendingMessageID || !files) {
        console.error("Missing required fields to update pending message.");
        return false;
      }
      const pending_messages =
        (await this.store.getItem("pending_messages")) || [];
      const messageIndex = pending_messages.findIndex(
        (pm) => pm.id === pendingMessageID
      );
      if (messageIndex !== -1) {
        pending_messages[messageIndex].id = newPendingMessageUUID;
        pending_messages[messageIndex].jobType = "upload";
        await this.store.setItem("pending_messages", pending_messages);

        // Update pending_files
        const pending_files = (await this.store.getItem("pending_files")) || [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileIndex = pending_files.findIndex(
            (pf) => pf.pendingMessageID === pendingMessageID && pf.index === i
          );
          if (fileIndex !== -1) {
            pending_files[fileIndex].pendingMessageID = newPendingMessageUUID;
            pending_files[fileIndex].uuid = file.uuid || null;
            pending_files[fileIndex].s3Url = file.s3Url || null;
            pending_files[fileIndex].ref = file.ref || null;
            pending_files[fileIndex].uri = null;
          }
        }
        await this.store.setItem("pending_files", pending_files);

        console.log(
          `Pending message ${pendingMessageID} updated successfully for upload.`
        );
        return true;
      }
      console.log(`Pending message ${pendingMessageID} not found.`);
      return false;
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
      const pending_messages = (await this.store.getItem("pending_messages")) || [];
      const messageIndex = pending_messages.findIndex(
        (pm) => pm.id === pendingMessageID
      );
      if (messageIndex !== -1) {
        pending_messages[messageIndex].jobType = "confirm";
        await this.store.setItem("pending_messages", pending_messages);
        console.log(`Pending message ${pendingMessageID} updated to confirm successfully.`);
        return true;
      }
      console.log(`Pending message ${pendingMessageID} not found.`);
      return false;
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
    try {
      const chats = (await this.store.getItem("chats")) || [];
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
      if (pendingMessages && pendingMessages.length > 0) {
        return pendingMessages[pendingMessages.length - 1];
      }
      const messages = (await this.store.getItem("messages")) || [];
      const users = (await this.store.getItem("users")) || [];
      const chatMessages = messages
        .filter((m) => m.chatUUID === chatUUID)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (chatMessages.length > 0) {
        const lastMessage = chatMessages[0];
        const sender = users.find((u) => u.uuid === lastMessage.senderUUID);
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
      const chatMembers = members.filter((m) => m.chatUUID === chatUUID);

      if (chatMembers.length === 1) {
        return users.find((u) => u.uuid === chatMembers[0].userUUID) || null;
      } else if (chatMembers.length === 2) {
        const localUser = await this.getLocalUser();
        const localUUID = localUser ? localUser.uuid : null;
        const otherMember = chatMembers.find((m) => m.userUUID !== localUUID);
        if (otherMember) {
          return users.find((u) => u.uuid === otherMember.userUUID) || null;
        }
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
          (h) => h.userUUID === user.uuid && h.type === "USER"
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
        .filter((m) => m.chatUUID === chatUUID)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((m) => {
          const sender = users.find((u) => u.uuid === m.senderUUID);
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
          uuid: found.userUUID || found.chatUUID || found.botUUID || null,
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
      const userMembers = members.filter((m) => m.userUUID === userUUID);
      const dmChats = chats.filter(
        (c) => c.type === "DM" && userMembers.some((m) => m.chatUUID === c.uuid)
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
      const members = (await this.store.getItem("members")) || [];
      const existingMember = members.find(
        (m) => m.userUUID === user.uuid && m.chatUUID === chatUUID
      );
      if (!existingMember) {
        members.push({
          userUUID: user.uuid,
          chatUUID: chatUUID,
        });
        await this.store.setItem("members", members);
        await this.addUserInfo(user);
      }
      console.log(`User ${user.uuid} added to chat ${chatUUID} successfully.`);
      return true;
    } catch (error) {
      console.error("Error adding member to chat:", error);
      return false;
    }
  }

  // async removeMember(chatUUID, user) {

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
