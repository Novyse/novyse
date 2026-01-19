import { getPlatform } from "../../device/type";
import {
  ChatType,
  HandleType,
  User,
  Chat,
  File,
  Message,
  MessageFile,
  PendingMessage,
  PendingFile,
  Bot,
  Handle,
  PinnedChat,
} from "./types";

const getDatabase = async () => {
  const platform = getPlatform();
  switch (platform) {
    case "web": {
      const { default: localforage } = await import("localforage");
      localforage.config({
        name: "novyse",
        storeName: "novyse_store",
      });
      return localforage;
    }
    case "mobile": {
      await import("expo-sqlite/localStorage/install");
      // Create a wrapper to mimic localforage's async JSON serialization
      const storage = {
        getItem: async (key: string) => {
          const value = globalThis.localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (key: string, value: any) => {
          globalThis.localStorage.setItem(key, JSON.stringify(value));
        },
      };
      return storage;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

let db: any;

const ensureDb = async () => {
  if (!db) {
    db = await getDatabase();
  }
  return db;
};

const setItem = async (key: string, value: any) => {
  await ensureDb();
  await db.setItem(key, value);
};

const getItem = async (key: string) => {
  await ensureDb();
  return db.getItem(key);
};

const database = {
  initialize: async () => {
    await ensureDb();

    // Initialize default data structures if not exist
    const chatTypes = await db.getItem("chat_types");
    if (!chatTypes) {
      await db.setItem("chat_types", [
        { value: "DM", description: "Direct message between two users." },
        { value: "GROUP", description: "Group chat with multiple members." },
        { value: "CHANNEL", description: "Broadcast channel." },
        { value: "FORUM", description: "Discussion forum." },
      ]);
    }

    const handleTypes = await db.getItem("handle_types");
    if (!handleTypes) {
      await db.setItem("handle_types", [
        { value: "USER", description: "The handle refers to a user." },
        { value: "CHAT", description: "The handle refers to a chat." },
        { value: "BOT", description: "The handle refers to a bot." },
      ]);
    }

    const tables = [
      "users",
      "chats",
      "bots",
      "handles",
      "files",
      "message_files",
    ];

    for (const table of tables) {
      const data = await db.getItem(table);
      if (!data) {
        await db.setItem(table, {});
      }
    }
  },
  user: {
    get: async (
      userUUID: string,
    ): Promise<(User & { username: string }) | undefined> => {
      const users = (await getItem("users")) || {};
      const handles = (await getItem("handles")) || {};

      const user = users[userUUID];
      const handle = handles[userUUID];

      return { ...user, username: handle.value };
    },
    add: async (user: User, username: Handle): Promise<void> => {
      const users = (await getItem("users")) || {};
      users[user.uuid] = user;

      const handles = (await getItem("handles")) || {};
      handles[username.uuid] = username;

      await setItem("users", users);
      await setItem("handles", handles);
    },
  },
  chat: {
    add: async (chat: Chat, handle?: Handle): Promise<void> => {
      const chats = (await getItem("chats")) || {};
      chats[chat.uuid] = chat;

      await setItem("chats", chats);

      if (handle) {
        const handles = (await getItem("handles")) || {};
        handles[handle.uuid] = handle;
        await setItem("handles", handles);
      }
    },
    members: {
      add: async (chatUUID: string, memberUUID: string): Promise<void> => {
        const chats = (await getItem("chats")) || {};
        const chat = chats[chatUUID];
        if (chat) {
          chat.members.push(memberUUID);
          await setItem("chats", chats);
        }
      },
      get: async (chatUUID: string): Promise<string[] | undefined> => {
        const chats = (await getItem("chats")) || {};
        const chat = chats[chatUUID];
        return chat?.members;
      },
      remove: async (chatUUID: string, memberUUID: string): Promise<void> => {
        const chats = (await getItem("chats")) || {};
        const chat = chats[chatUUID];
        if (chat) {
          chat.members = chat.members.filter(
            (uuid: string) => uuid !== memberUUID,
          );
          await setItem("chats", chats);
        }
      },
    },
    message: {
      add: async (message: Message): Promise<void> => {
        const messages = (await getItem("messages")) || {};
        messages[message.id] = message;
        await setItem("messages", messages);
      },
    },
  },
};

export default database;
