import { create } from "zustand";
import { Chat } from "@/src/types";
import database from "@/src/utils/storage/database";

interface ChatState {
  chats: Chat[];
  pinnedChats: { chatUUID: string; position: number }[];
  loading: boolean;
  loadingMessages: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  historyLoaded: Record<string, boolean>;
  init: () => Promise<void>;
  loadChats: () => Promise<void>;
  loadPinnedChats: () => Promise<void>;
  loadMoreMessages: (chatUUID: string) => Promise<void>;
  selectChat: (
    chatUUID: string | null,
    chatHandle?: string | null,
  ) => Promise<void>;
  _eventsSetup: boolean;
  setupEvents: () => Promise<void>;
  onNewChat: (chat: Chat) => void;
  onNewMessage: (message: any) => void;
  onMessageUpload: (payload: { tempId: string; message: any }) => void;
  onMessageDownloaded: (payload: { message: any; file: any }) => void;
  onMessageSent: (payload: { tempId: string; message: any }) => void;
  onMessageUpdate: (payload: {
    chatUUID: string;
    messageID: string;
    action: string;
    data: any;
  }) => void;
  onFileDownloaded: (payload: { file: any }) => void;
  onChatUpdate: (payload: {
    chatUUID: string;
    action: string;
    data: any;
  }) => void;
}

const CHUNK_SIZE = 50;

const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  pinnedChats: [],
  loading: false,
  loadingMessages: {},
  hasMore: {},
  historyLoaded: {},

  init: async () => {
    set({ loading: true });
    await get().loadChats();
    await get().loadPinnedChats();
    set({ loading: false });
  },

  loadChats: async () => {
    const chats = await database.chat.get.all();
    set({ chats });
    get().setupEvents();
  },

  loadPinnedChats: async () => {
    const pinnedChats = await database.chat.pin.get();
    set({ pinnedChats });
  },

  loadMoreMessages: async (chatUUID: string) => {
    if (get().loadingMessages[chatUUID] || !get().hasMore[chatUUID]) return;

    const currentChat = get().chats.find((c) => c.uuid === chatUUID);
    if (!currentChat) return;

    set((state) => ({
      loadingMessages: { ...state.loadingMessages, [chatUUID]: true },
    }));

    const currentMessagesCount = currentChat.messages.length;

    const olderMessages = await database.getMessagesByChatUUID(
      chatUUID,
      CHUNK_SIZE,
      currentMessagesCount,
    );

    set((state) => ({
      loadingMessages: { ...state.loadingMessages, [chatUUID]: false },
      hasMore: {
        ...state.hasMore,
        [chatUUID]: olderMessages.length === CHUNK_SIZE,
      },
      chats: state.chats.map((chat) =>
        chat.uuid === chatUUID
          ? { ...chat, messages: [...olderMessages, ...chat.messages] }
          : chat,
      ),
    }));
  },
  // @SamueleOrazioDurante sto metodo è da vedere
  selectChat: async (
    chatUUID: string | null,
    chatHandle: string | null = null,
  ) => {
    if (!chatUUID && !chatHandle) return;

    // Check if we already have it in store
    const existing = get().chats.find(
      (c) =>
        c.uuid === chatUUID || (chatHandle && (c as any).handle === chatHandle),
    );

    const targetID = chatUUID || chatHandle || "";

    // Skip if already loading or if history already loaded for this session
    if (
      get().loadingMessages[targetID] ||
      (chatUUID && get().historyLoaded[chatUUID])
    ) {
      return;
    }

    set((state) => ({
      loadingMessages: { ...state.loadingMessages, [targetID]: true },
    }));

    try {
      if (chatUUID) {
        // Local load
        const messages = await database.getMessagesByChatUUID(
          chatUUID,
          CHUNK_SIZE,
          0,
        );
        const pending = await database.getPendingMessagesByChatUUID(chatUUID);
        const allMessages = [
          ...messages,
          ...pending.map((pm: any) => ({
            ...pm,
            internal: true,
          })),
        ];
        const members = await database.getMembersByChatUUID(chatUUID);

        set((state) => ({
          loadingMessages: { ...state.loadingMessages, [chatUUID]: false },
          hasMore: {
            ...state.hasMore,
            [chatUUID]: messages.length === CHUNK_SIZE,
          },
          historyLoaded: { ...state.historyLoaded, [chatUUID]: true },
          chats: state.chats.map((c) =>
            c.uuid === chatUUID ? { ...c, messages: allMessages, members } : c,
          ),
        }));
      } else if (chatHandle) {
        // Handle load (Discovery)
        const { default: gateway }: any =
          await import("@/src/utils/backend-services/api-gateway");
        const { success, data }: any = await gateway.gather.handle(
          chatHandle,
          true,
        );

        if (success) {
          const {
            type,
            handle,
            profilePictureUUID,
            messages = [],
            members = [],
            uuid,
          } = data;

          // Re-check if it exists by UUID now that we have it
          const existingByUUID = get().chats.find((c) => c.uuid === uuid);
          if (existingByUUID) {
            get().selectChat(uuid);
            return;
          }

          const newChat: Chat = {
            uuid,
            handle,
            type,
            name:
              data.name ||
              (type === "USER" ? `${data.name} ${data.surname}` : "Unknown"),
            profilePictureUUID,
            messages: messages.reverse(),
            members: members.map((m: any) => ({
              uuid: m.userUUID || m,
              role: "member",
              joinedAt: new Date(),
            })),
            unreadCount: 0,
            pinnedMessages: [],
            editedMessages: [],
            deletedMessages: [],
          };

          set((state) => ({
            loadingMessages: { ...state.loadingMessages, [chatHandle]: false },
            historyLoaded: { ...state.historyLoaded, [uuid]: true },
            chats: [...state.chats, newChat],
          }));

          if (type !== "USER") {
            const { default: SocketIO }: any =
              await import("@/src/utils/backend-services/socket-io");
            SocketIO.send()?.subscribe(handle);
          }
        }
      }
    } catch (error) {
      console.error("Error selecting chat:", error);
    } finally {
      set((state) => ({
        loadingMessages: { ...state.loadingMessages, [targetID]: false },
      }));
    }
  },

  _eventsSetup: false,
  setupEvents: async () => {
    if (get()._eventsSetup) return;
    const { default: eventEmitter }: any =
      await import("@/src/utils/global/Events/EventEmitter");

    eventEmitter.getEmitter().on("chat:new", get().onNewChat);
    eventEmitter.getEmitter().on("message:new", get().onNewMessage);
    eventEmitter.getEmitter().on("message:upload", get().onMessageUpload);
    eventEmitter
      .getEmitter()
      .on("message:downloaded", get().onMessageDownloaded);
    eventEmitter.getEmitter().on("message:sent", get().onMessageSent);
    eventEmitter.getEmitter().on("message:update", get().onMessageUpdate);
    eventEmitter.getEmitter().on("file:downloaded", get().onFileDownloaded);
    eventEmitter.getEmitter().on("chat:update", get().onChatUpdate);

    set({ _eventsSetup: true });
  },

  onNewChat: (chat: Chat) => {
    set((state) => ({ chats: [...state.chats, chat] }));
  },

  onNewMessage: (message: any) => {
    set((state) => ({
      chats: state.chats.map((chat) => {
        const isMatch =
          chat.uuid === message.chatUUID ||
          (message.chatHandle && (chat as any).handle === message.chatHandle);
        if (!isMatch) return chat;
        if (chat.messages.some((m: any) => m.id === message.id)) return chat;

        const safeMessage = {
          ...message,
        };

        return { ...chat, messages: [...chat.messages, safeMessage] };
      }),
    }));
  },

  onMessageUpload: ({ tempId, message }: { tempId: string; message: any }) => {
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.uuid !== message.chatUUID) return chat;
        return {
          ...chat,
          messages: chat.messages.map((msg: any) =>
            msg.id === tempId
              ? { ...msg, ...message, id: message.messageUUID }
              : msg,
          ),
        };
      }),
    }));
  },

  onMessageDownloaded: ({ message, file }: { message: any; file: any }) => {
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (
          chat.uuid !== message.chatUUID &&
          (chat as any).handle !== message.chatHandle
        )
          return chat;
        return {
          ...chat,
          messages: chat.messages.map((msg: any) =>
            msg.id === message.id
              ? {
                  ...msg,
                  files: msg.files.map((f: any) =>
                    f.uuid === file.uuid ? file : f,
                  ),
                }
              : msg,
          ),
        };
      }),
    }));
  },

  onMessageSent: ({ tempId, message }: { tempId: string; message: any }) => {
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.uuid !== message.chatUUID) return chat;
        const filteredMessages = chat.messages.filter(
          (msg: any) => msg.id !== message.id,
        );
        return {
          ...chat,
          messages: filteredMessages.map((msg: any) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: message.id,
                  replyTo: message.replyTo,
                  created_at: message.created_at,
                  internal: false,
                }
              : msg,
          ),
        };
      }),
    }));
  },

  onMessageUpdate: ({
    chatUUID: eChatUUID,
    messageID,
    action,
    data,
  }: {
    chatUUID: string;
    messageID: string;
    action: string;
    data: any;
  }) => {
    set((state) => ({
      chats: state.chats.map((chat) => {
        if (chat.uuid !== eChatUUID) return chat;

        switch (action) {
          case "edit":
            return {
              ...chat,
              messages: chat.messages.map((msg: any) =>
                msg.id === messageID ? { ...msg, ...data } : msg,
              ),
            };

          case "delete":
            return {
              ...chat,
              messages: chat.messages.filter(
                (msg: any) => msg.id !== messageID,
              ),
            };

          case "pin_add":
            return {
              ...chat,
              pinnedMessages: [
                ...(chat.pinnedMessages || []),
                { chatUUID: eChatUUID, messageID },
              ] as any,
            };

          case "pin_remove":
            return {
              ...chat,
              pinnedMessages: (chat.pinnedMessages || []).filter(
                (p: any) => (p.messageID || p) !== messageID,
              ),
            };

          case "reaction_add": {
            return {
              ...chat,
              messages: chat.messages.map((msg: any) => {
                if (msg.id !== messageID) return msg;
                const reactions = msg.reactions || [];
                const existingIdx = reactions.findIndex(
                  (r: any) => r.emoji === data.reaction,
                );
                const newReactions = [...reactions];
                if (existingIdx >= 0) {
                  const existing = newReactions[existingIdx];
                  if (!existing.userUUIDs.includes(data.userUUID)) {
                    newReactions[existingIdx] = {
                      ...existing,
                      userUUIDs: [...existing.userUUIDs, data.userUUID],
                      at: data.at || new Date().toISOString(),
                    };
                  }
                } else {
                  newReactions.push({
                    emoji: data.reaction,
                    userUUIDs: [data.userUUID],

                    at: data.at || new Date().toISOString(),
                  });
                }
                return { ...msg, reactions: newReactions };
              }),
            };
          }

          case "reaction_remove": {
            return {
              ...chat,
              messages: chat.messages.map((msg: any) => {
                if (msg.id !== messageID || !msg.reactions) return msg;
                const existingIdx = msg.reactions.findIndex(
                  (r: any) => r.emoji === data.reaction,
                );
                if (existingIdx < 0) return msg;
                const newReactions = [...msg.reactions];
                const existing = newReactions[existingIdx];
                const newUserUUIDs = existing.userUUIDs.filter(
                  (id: string) => id !== data.userUUID,
                );
                if (newUserUUIDs.length === 0) {
                  newReactions.splice(existingIdx, 1);
                } else {
                  newReactions[existingIdx] = {
                    ...existing,
                    userUUIDs: newUserUUIDs,
                  };
                }
                return { ...msg, reactions: newReactions };
              }),
            };
          }

          default:
            return chat;
        }
      }),
    }));
  },

  onFileDownloaded: ({ file }: { file: any }) => {
    set((state) => ({
      chats: state.chats.map((chat) => ({
        ...chat,
        messages: chat.messages.map((msg: any) => {
          const updatedFiles = msg.files.map((f: any) =>
            f.uuid === file.uuid
              ? {
                  ...f,
                  ref: file.ref,
                  waveform: file.waveform,
                  duration: file.duration,
                }
              : f,
          );
          return { ...msg, files: updatedFiles };
        }),
      })),
    }));
  },

  onChatUpdate: ({
    chatUUID,
    action,
    data,
  }: {
    chatUUID: string;
    action: string;
    data: any;
  }) => {
    if (action === "pin_add") {
      const position = data?.position ?? 0;
      set((state) => {
        let newPinned = state.pinnedChats.filter(
          (c) => c.chatUUID !== chatUUID,
        );
        newPinned = newPinned.map((c) => {
          if (c.position >= position) {
            return { ...c, position: c.position + 1 };
          }
          return c;
        });
        newPinned.push({ chatUUID, position });
        newPinned.sort((a, b) => a.position - b.position);
        return {
          pinnedChats: newPinned.map((c, index) => ({ ...c, position: index })),
        };
      });
    } else if (action === "pin_remove") {
      set((state) => {
        let newPinned = state.pinnedChats.filter(
          (c) => c.chatUUID !== chatUUID,
        );
        newPinned.sort((a, b) => a.position - b.position);
        return {
          pinnedChats: newPinned.map((c, index) => ({ ...c, position: index })),
        };
      });
    }
  },
}));

export default useChatStore;
