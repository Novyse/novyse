import { create } from "zustand";
import { router } from "expo-router";

import EventEmitter from "@/src/utils/global/Events/EventEmitter";
import gateway from "@/src/utils/backend-services/api-gateway";
import useChatStore from "./ChatContext";
import useUserStore from "./UserContext";

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
  headerHeight: number;

  chatUIStates: Record<string, ChatUIState>;
  activeChatData: any | null;

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
  setHeaderHeight: (height: number) => void;

  setSelectedChatUUID: (uuid: string | null) => Promise<void>;
  setSelectedHandle: (handle: string | null) => Promise<void>;
  clear: () => void;
}

export const useActiveChatStore = create<ActiveChatState>((set, get) => {
  EventEmitter.getEmitter().on(
    "chat:new",
    (data: { chat: any; users: any[] }) => {
      const { chat, users } = data;
      let handle;
      if (chat.type === "DM") {
        const userUUID = useUserStore.getState().localUserUUID;
        const otherUser = chat.members?.find(
          (member: any) =>
            member.uuid !== userUUID && member.userUUID !== userUUID,
        );
        const otherDataUser = users?.find((u: any) => u.uuid !== userUUID);
        handle =
          otherUser?.handle ||
          otherUser?.user?.handle ||
          otherDataUser?.handle ||
          chat.handle;
      } else {
        handle = chat.handle;
      }

      const { selectedChatUUID, selectedHandle, setSelectedChatUUID } = get();
      if (
        selectedChatUUID === null &&
        selectedHandle?.toLowerCase() === handle?.toLowerCase()
      ) {
        setSelectedChatUUID(chat.uuid);
      }
    },
  );

  return {
    selectedChatUUID: null,
    selectedHandle: null,
    selectedSub: 0,
    headerHeight: 0,

    // Default current UI
    ...defaultUIState,

    // Record to store UI state for each chat by its UUID or handle
    chatUIStates: {},

    activeChatData: null,

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
        files:
          typeof files === "function" ? (files as any)(state.files) : files,
      }));
      get().saveCurrentUIState();
    },
    setInvalidFiles: (invalids) => {
      set((state) => ({
        invalidFiles:
          typeof invalids === "function"
            ? (invalids as any)(state.invalidFiles)
            : invalids,
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
    setHeaderHeight: (height) => set({ headerHeight: height }),

    setSelectedChatUUID: async (uuid: string | null) => {
      if (uuid !== null && get().selectedChatUUID === uuid) return;

      const { selectedSub, saveCurrentUIState, loadUIState } = get();

      saveCurrentUIState();

      const localChats = useChatStore.getState().chats || [];
      const chatData = localChats.find((c: any) => c.uuid === uuid) || null;

      const newUI = loadUIState(uuid);

      set({
        selectedChatUUID: uuid,
        selectedHandle: null,
        activeChatData: chatData,
        ...newUI,
      });

      if (uuid) {
        router.navigate(`/app/chat/${uuid}/${selectedSub}`);
      }
    },

    setSelectedHandle: async (handle: string | null) => {
      if (handle !== null && get().selectedHandle === handle) return;

      const { selectedSub, saveCurrentUIState, loadUIState } = get();

      saveCurrentUIState();

      const localChats = useChatStore.getState().chats || [];
      const localChat =
        localChats.find((c: any) => {
          if (c.handle) {
            return c.handle.toLowerCase() === handle?.toLowerCase();
          }
          if (c.type === "DM") {
            const userUUID = useUserStore.getState().localUserUUID;
            if (c.members) {
              const otherUser = c.members.find(
                (m: any) => (m.uuid || m.userUUID) !== userUUID,
              );
              const otherHandle = otherUser?.handle || otherUser?.user?.handle;
              if (otherHandle) {
                return otherHandle.toLowerCase() === handle?.toLowerCase();
              }
            }
          }
          return false;
        }) || null;

      if (localChat) {
        const newUI = loadUIState(localChat.uuid);
        set({
          selectedHandle: null,
          selectedChatUUID: localChat.uuid,
          activeChatData: localChat,
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
      });

      interface FetchedChat {
        uuid: string;
        handle: string;
        type: string;
        members?: any[];
      }
      let fetchedChat: FetchedChat | null = null;
      if (handle) {
        try {
          const response: any = await gateway.gather.handle(handle, true);
          if (response.success && response.data) {
            fetchedChat = response.data;

            if (!fetchedChat) return;

            if (fetchedChat.type === "USER") {
              // If it's a user, we create a DM chat with them, so i need to set its UUID as a memberUUID
              fetchedChat.members = [{ uuid: fetchedChat.uuid }];
            }

            // Check if we actually already have this chat by UUID locally
            // This happens when you search for a handle but the chat was already in your DB
            const existingByUUID = useChatStore
              .getState()
              .chats.find((c) => c.uuid === fetchedChat?.uuid);

            if (existingByUUID) {
              const newUI = loadUIState(fetchedChat.uuid);
              set({
                selectedChatUUID: fetchedChat.uuid,
                selectedHandle: null,
                activeChatData: existingByUUID,
                ...newUI,
              });
              router.push(`/app/chat/${fetchedChat.uuid}/${selectedSub}`);
              return;
            }
          }
        } catch (error) {
          console.error("error fetching api handled chat", error);
        }
      }

      const currentState = get();
      if (currentState.selectedHandle !== handle) return;

      const newUI = loadUIState(handle);
      set({
        activeChatData: fetchedChat,
        ...newUI,
      });

      if (handle) {
        router.replace(`/app/chat/${handle}/${selectedSub}`);
      }
    },

    clear: () => {
      const { saveCurrentUIState } = get();
      saveCurrentUIState();
      set({
        selectedChatUUID: null,
        selectedHandle: null,
        activeChatData: null,
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
    if (activeState.activeChatData !== updatedChat) {
      useActiveChatStore.setState({
        activeChatData: updatedChat,
      });
    }
  }
});
