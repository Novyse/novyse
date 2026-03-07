import { create } from "zustand";
import { Chat, Message } from "@/src/types";
import database from "@/src/utils/storage/database";

interface ChatState {
  chats: Chat[];
  loading: boolean;
  load: () => Promise<void>;
  loadMoreMessages: (chatUUID: string) => Promise<void>;
  _eventsSetup: boolean;
  setupEvents: () => Promise<void>;
  onNewChat: (chat: Chat) => void;
  onNewMessage: (message: Message) => void;
}

const CHUNK_SIZE = 50;

const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const chats = await database.chat.get.all();
    set({ chats, loading: false });
    console.log(chats);
    get().setupEvents();
  },

  loadMoreMessages: async (chatUUID: string) => {
    const currentChat = get().chats.find((c) => c.uuid === chatUUID);
    if (!currentChat) return;

    const currentMessagesCount = currentChat.messages.length;

    const olderMessages = await database.getMessagesByChatUUID(
      chatUUID,
      CHUNK_SIZE,
      currentMessagesCount,
    );

    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.uuid === chatUUID
          ? { ...chat, messages: [...olderMessages, ...chat.messages] }
          : chat,
      ),
    }));
  },

  _eventsSetup: false,
  setupEvents: async () => {
    if (get()._eventsSetup) return;
    const { default: eventEmitter } =
      await import("@/src/utils/global/Events/EventEmitter");
    eventEmitter.getEmitter().on("chat:new", get().onNewChat);
    eventEmitter.getEmitter().on("message:new", get().onNewMessage);
    set({ _eventsSetup: true });
  },

  onNewChat: (chat: Chat) => {
    set((state) => ({ chats: [...state.chats, chat] }));
  },

  onNewMessage: (message: Message) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.uuid === message.chatUUID
          ? { ...chat, messages: [...chat.messages, message] }
          : chat,
      ),
    }));
  },
}));

export default useChatStore;
