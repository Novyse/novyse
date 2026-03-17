import { create } from "zustand";
import { router } from "expo-router";

import EventEmitter from "@/src/utils/global/Events/EventEmitter";
import auth from "@/src/utils/welcome/auth";
import gateway from "@/src/utils/backend-services/api-gateway";
import socketService from "@/src/utils/backend-services/socket-io";
import useChatStore from "./ChatContext";

export interface ChatUIState {
  contentView: "chat" | "vocal" | "both";
  newMessageText: string;
  files: any[];
  invalidFiles: any[];
  editingMessage: any | null;
  selectedMessages: any[];
  replyingTo: any[];
}

const defaultUIState: ChatUIState = {
  contentView: "chat",
  newMessageText: "",
  files: [],
  invalidFiles: [],
  editingMessage: null,
  selectedMessages: [],
  replyingTo: [],
};

export interface ActiveChatState extends ChatUIState {
  selectedChatUUID: string | null;
  selectedHandle: string | null;
  selectedSub: number;

  chatUIStates: Record<string, ChatUIState>;
  activeChatData: any | null;
  isVolatile: boolean;

  getCurrentChat: () => any;
  saveCurrentUIState: () => void;
  loadUIState: (id: string | null) => ChatUIState;

  setContentView: (
    view:
      | "chat"
      | "vocal"
      | "both"
      | ((prev: "chat" | "vocal" | "both") => "chat" | "vocal" | "both"),
  ) => void;
  setNewMessageText: (text: string | ((prev: string) => string)) => void;
  setFiles: (files: any[] | ((prev: any[]) => any[])) => void;
  setInvalidFiles: (invalids: any[] | ((prev: any[]) => any[])) => void;
  setEditingMessage: (msg: any | ((prev: any) => any)) => void;
  setSelectedMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
  setReplyingTo: (reply: any[] | ((prev: any[]) => any[])) => void;
  setSelectedSub: (sub: number | ((prev: number) => number)) => void;

  cleanupVolatileEvents: () => void;
  volatileEventListener: (eventData: any) => void;

  setSelectedChatUUID: (uuid: string | null) => Promise<void>;
  setSelectedHandle: (handle: string | null) => Promise<void>;
  reset: () => void;
}

export const useActiveChatStore = create<ActiveChatState>((set, get) => {
  EventEmitter.getEmitter().on("newChat", async (chat: any) => {
    let handle;
    if (chat.type === "DM") {
      const userUUID = await auth.getUserUUID();
      const otherUser = chat.members.find(
        (member: any) => member.uuid !== userUUID,
      );
      handle = otherUser.handle;
    } else {
      handle = chat.handle;
    }

    const { selectedChatUUID, selectedHandle, setSelectedChatUUID } = get();
    if (selectedChatUUID === null && selectedHandle === handle) {
      setSelectedChatUUID(chat.uuid);
    }
  });

  return {
    selectedChatUUID: null,
    selectedHandle: null,
    selectedSub: 0,

    // Default current UI
    ...defaultUIState,

    // Record to store UI state for each chat by its UUID or handle
    chatUIStates: {},

    activeChatData: null,
    isVolatile: false,

    getCurrentChat: () => get().activeChatData,

    saveCurrentUIState: () => {
      const state = get();
      const id = state.selectedChatUUID || state.selectedHandle;
      if (!id) return;
      const uiState = {
        contentView: state.contentView,
        newMessageText: state.newMessageText,
        files: state.files,
        invalidFiles: state.invalidFiles,
        editingMessage: state.editingMessage,
        selectedMessages: state.selectedMessages,
        replyingTo: state.replyingTo,
      };
      set((s) => ({
        chatUIStates: { ...s.chatUIStates, [id]: uiState },
      }));
    },

    loadUIState: (id: string | null) => {
      if (!id) return defaultUIState;
      const state = get();
      return state.chatUIStates[id] || defaultUIState;
    },

    setContentView: (view) => {
      set((state) => ({
        contentView:
          typeof view === "function" ? (view as any)(state.contentView) : view,
      }));
      get().saveCurrentUIState();
    },
    setNewMessageText: (text) => {
      set((state) => ({
        newMessageText:
          typeof text === "function"
            ? (text as any)(state.newMessageText)
            : text,
      }));
      get().saveCurrentUIState();
    },
    setFiles: (files) => {
      set((state) => ({
        files: typeof files === "function" ? (files as any)(state.files) : files,
      }));
      get().saveCurrentUIState();
    },
    setInvalidFiles: (invalids) => {
      set((state) => ({
        invalidFiles: typeof invalids === "function" ? (invalids as any)(state.invalidFiles) : invalids,
      }));
      get().saveCurrentUIState();
    },
    setEditingMessage: (msg) => {
      set((state) => ({
        editingMessage:
          typeof msg === "function" ? (msg as any)(state.editingMessage) : msg,
      }));
      get().saveCurrentUIState();
    },
    setSelectedMessages: (msgs) => {
      set((state) => ({
        selectedMessages:
          typeof msgs === "function"
            ? (msgs as any)(state.selectedMessages)
            : msgs,
      }));
      get().saveCurrentUIState();
    },
    setReplyingTo: (reply) => {
      set((state) => ({
        replyingTo:
          typeof reply === "function"
            ? (reply as any)(state.replyingTo)
            : reply,
      }));
      get().saveCurrentUIState();
    },
    setSelectedSub: (sub) =>
      set((state) => ({
        selectedSub:
          typeof sub === "function" ? (sub as any)(state.selectedSub) : sub,
      })),

    cleanupVolatileEvents: () => {
      // socket.off etc
    },

    volatileEventListener: (eventData: any) => {
      set((state) => {
        if (!state.activeChatData) return state;
        return {
          activeChatData: {
            ...state.activeChatData,
            messages: state.activeChatData.messages
              ? [...state.activeChatData.messages, eventData]
              : [eventData],
          },
        };
      });
    },

    setSelectedChatUUID: async (uuid: string | null) => {
      if (uuid !== null && get().selectedChatUUID === uuid) return;

      const {
        selectedSub,
        cleanupVolatileEvents,
        saveCurrentUIState,
        loadUIState,
      } = get();

      saveCurrentUIState();
      cleanupVolatileEvents();

      const localChats = useChatStore.getState().chats || [];
      const chatData = localChats.find((c: any) => c.uuid === uuid) || null;

      const newUI = loadUIState(uuid);

      set({
        selectedChatUUID: uuid,
        selectedHandle: null,
        activeChatData: chatData,
        isVolatile: false,
        ...newUI,
      });

      if (uuid) {
        router.navigate(`/app/chat/${uuid}/${selectedSub}`);
      }
    },

    setSelectedHandle: async (handle: string | null) => {
      if (handle !== null && get().selectedHandle === handle) return;

      const {
        selectedSub,
        cleanupVolatileEvents,
        volatileEventListener,
        saveCurrentUIState,
        loadUIState,
      } = get();

      saveCurrentUIState();
      cleanupVolatileEvents();

      const localChats = useChatStore.getState().chats || [];
      const localChat =
        localChats.find(
          (c: any) => c.handle?.toLowerCase() === handle?.toLowerCase(),
        ) || null;

      if (localChat) {
        const newUI = loadUIState(localChat.uuid);
        set({
          selectedHandle: null,
          selectedChatUUID: localChat.uuid,
          activeChatData: localChat,
          isVolatile: false,
          ...newUI,
        });
        if (localChat.uuid) {
          router.replace(`/app/chat/${localChat.uuid}/${selectedSub}`);
        }
        return;
      }

      set({
        selectedHandle: handle,
        selectedChatUUID: null,
        activeChatData: null,
        isVolatile: true,
      });

      let fetchedChat = null;
      if (handle) {
        try {
          const response = await gateway.gather.handle(handle, true);
          if (response.success && response.data) {
            fetchedChat = response.data;

            if (fetchedChat.type === "USER") {
              // If it's a user, we create a DM chat with them, so i need to set its UUID as a memberUUID
              fetchedChat.members = [{ uuid: fetchedChat.uuid }];
            }

            // Check if we actually already have this chat by UUID locally
            // This happens when you search for a handle but the chat was already in your DB
            const existingByUUID = useChatStore
              .getState()
              .chats.find((c) => c.uuid === fetchedChat.uuid);

            if (existingByUUID) {
              const newUI = loadUIState(fetchedChat.uuid);
              set({
                selectedChatUUID: fetchedChat.uuid,
                selectedHandle: null,
                activeChatData: existingByUUID,
                isVolatile: false,
                ...newUI,
              });
              router.navigate(`/app/chat/${fetchedChat.uuid}/${selectedSub}`);
              return;
            }
          }
        } catch (error) {
          console.error("error fetching api handled chat", error);
        }
      }

      const currentState = get();
      if (currentState.selectedHandle !== handle || !currentState.isVolatile)
        return;

      const newUI = loadUIState(handle);
      set({
        activeChatData: fetchedChat,
        ...newUI,
      });

      if (handle) {
        router.replace(`/app/chat/${handle}/${selectedSub}`);
      }
    },

    reset: () => {
      const { cleanupVolatileEvents, saveCurrentUIState } = get();
      saveCurrentUIState();
      cleanupVolatileEvents();
      set({
        selectedChatUUID: null,
        selectedHandle: null,
        activeChatData: null,
        isVolatile: false,
        ...defaultUIState,
      });
    },
  };
});

useChatStore.subscribe((state) => {
  const activeState = useActiveChatStore.getState();

  let updatedChat = null;

  if (activeState.selectedChatUUID) {
    updatedChat = state.chats?.find(
      (c: any) => c.uuid === activeState.selectedChatUUID,
    );
  } else if (activeState.selectedHandle) {
    updatedChat = state.chats?.find(
      (c: any) => c.handle === activeState.selectedHandle,
    );
  }

  if (updatedChat) {
    if (activeState.activeChatData !== updatedChat || activeState.isVolatile) {
      useActiveChatStore.setState({
        activeChatData: updatedChat,
        isVolatile: false,
      });
    }
  }
});
