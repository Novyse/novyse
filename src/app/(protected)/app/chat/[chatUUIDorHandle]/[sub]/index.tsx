import React, {
  useState,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import ChatContent from "@/src/components/chat/content/Chat";
import Header from "@/src/components/chat/content/header/ChatHeader";
import VocalContent from "@/src/components/comms/container";

import { useScreen } from "@/src/context/ScreenContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { ThemeContext } from "@/src/context/ThemeContext";
import useWindowSizeStore, {
  SUBLIST_MIN,
  CHAT_MIN,
  VOCAL_MIN,
} from "@/src/context/WindowSizeContext";

import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import PanelResizeHandle from "@/src/components/layout/PanelResizeHandle";
import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers";
import { useForward } from "@/src/hooks/chat/useForward";

import DeleteMessageModal from "@/src/components/modalSheets/DeleteMessage";
import JoinCreateChat from "@/src/components/features/chat/createChat/CreateOrJoinChatPanel";
import AppText from "@/src/components/ui/text/AppText";
import SubList from "@/src/components/chat/content/SubList";

const ChatPageRoute = () => {
  const params = useLocalSearchParams();
  const { chatUUIDorHandle, sub } = params;

  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );
  const selectedHandle = useActiveChatStore((state) => state.selectedHandle);
  const setSelectedHandle = useActiveChatStore(
    (state) => state.setSelectedHandle,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const setSelectedSub = useActiveChatStore((state) => state.setSelectedSub);
  const selectedMessages = useActiveChatStore(
    (state) => state.selectedMessages,
  );
  const setSelectedMessages = useActiveChatStore(
    (state) => state.setSelectedMessages,
  );
  const contentView = useActiveChatStore((state) => state.contentView);
  const setContentView = useActiveChatStore((state) => state.setContentView);
  const setReplyingTo = useActiveChatStore((state) => state.setReplyingTo);
  const setNewMessageText = useActiveChatStore(
    (state) => state.setNewMessageText,
  );
  const editingMessage = useActiveChatStore((state) => state.editingMessage);
  const setEditingMessage = useActiveChatStore(
    (state) => state.setEditingMessage,
  );

  const { handleDeleteMessage } = useMessageHandlers(
    setNewMessageText,
    setEditingMessage,
  );

  const { startForwarding } = useForward();

  const handleSelectedForward = useCallback(() => {
    if (selectedMessages.length === 0) return;
    startForwarding(selectedMessages);
    setSelectedMessages([]);
  }, [selectedMessages, startForwarding, setSelectedMessages]);

  const { theme } = useContext(ThemeContext);
  const { isSmallScreen, isMediumScreen } = useScreen();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [containerWidth, setContainerWidth] = useState(0);
  const { width } = useWindowDimensions();

  const {
    vocalWidth,
    setVocalWidth,
    subListWidth,
    setSubListWidth,
    setDetailWidth,
    setMinDetailWidth,
  } = useWindowSizeStore();

  const chat = useActiveChatStore((state) => state.activeChatData);
  const isForum = chat?.type === "FORUM";

  // Effective width available to the columns rendered by this page
  // (SubList | Chat | Vocal). Falls back to the window width until the
  // container has been measured to avoid a broken first frame.
  const availableWidth = containerWidth || width;
  const effectiveSubListWidth = isForum && !isSmallScreen ? subListWidth : 0;

  // The vocal panel can only ever occupy the space left after the SubList and
  // the minimum chat width have been reserved.
  const resizerHandlers = usePanelResizer({
    currentWidth: vocalWidth,
    setWidth: setVocalWidth,
    minWidth: VOCAL_MIN,
    maxWidthPadding: CHAT_MIN,
    containerWidth: availableWidth - effectiveSubListWidth,
  });

  // The SubList can grow until it would push the chat (and, when open, the
  // vocal panel) below their minimum widths.
  const subListResizerHandlers = usePanelResizer({
    currentWidth: subListWidth,
    setWidth: setSubListWidth,
    minWidth: SUBLIST_MIN,
    maxWidthPadding: CHAT_MIN + (contentView === "both" ? vocalWidth : 0),
    containerWidth: availableWidth,
    reverse: false,
  });

  // Keep the vocal panel width inside the space left by the SubList + chat.
  useEffect(() => {
    const contentWidth = availableWidth - effectiveSubListWidth;
    const maxVocal = contentWidth - CHAT_MIN;
    setVocalWidth((prev) =>
      Math.max(VOCAL_MIN, Math.min(Math.max(VOCAL_MIN, maxVocal), prev)),
    );
  }, [availableWidth, effectiveSubListWidth, contentView, setVocalWidth]);

  // Keep the SubList width inside the space left by the chat (+ vocal panel).
  useEffect(() => {
    if (!isForum || isSmallScreen) return;
    const reservedForContent =
      CHAT_MIN + (contentView === "both" ? vocalWidth : 0);
    const maxSubList = availableWidth - reservedForContent;
    setSubListWidth((prev) =>
      Math.max(SUBLIST_MIN, Math.min(Math.max(SUBLIST_MIN, maxSubList), prev)),
    );
  }, [
    availableWidth,
    contentView,
    vocalWidth,
    isForum,
    isSmallScreen,
    setSubListWidth,
  ]);

  useEffect(() => {
    if (!setMinDetailWidth) return;
    // Reserve room for the SubList column in forums so the detail pane can
    // never shrink below what its columns need.
    const subListReserve = isForum && !isSmallScreen ? SUBLIST_MIN : 0;
    if (contentView === "both") {
      setMinDetailWidth(700 + subListReserve);
    } else {
      setMinDetailWidth(400 + subListReserve);
    }
    return () => {
      setMinDetailWidth(400);
    };
  }, [contentView, isForum, isSmallScreen, setMinDetailWidth]);

  // Auto-collapse split view when window is too narrow
  useEffect(() => {
    if (contentView === "both" && (isSmallScreen || isMediumScreen)) {
      setContentView("chat");
    }
  }, [isSmallScreen, isMediumScreen, contentView, setContentView]);

  const subType = chat?.subs?.find((s) => s.id === selectedSub)?.type;

  useEffect(() => {
    if (subType === "VOCAL" && contentView !== "vocal") {
      setContentView("vocal");
    } else if (
      ["TEXT", "ANNOUNCE"].includes(subType as string) &&
      contentView !== "chat"
    ) {
      setContentView("chat");
    }
  }, [subType, contentView, setContentView]);

  useEffect(() => {
    if (chatUUIDorHandle) {
      const state = useActiveChatStore.getState();

      const subIndex = params.sub ? parseInt(params.sub as string, 10) : 0;

      if (
        chatUUIDorHandle === state.selectedChatUUID ||
        chatUUIDorHandle === state.selectedHandle
      ) {
        // Same chat, only the sub changed (or first render): follow the URL.
        if (state.selectedSub !== subIndex) {
          setSelectedSub(subIndex);
        }
        return;
      }

      // Switching chat: the sub in the URL is authoritative so it isn't
      // overridden by the previously-remembered sub.
      // Assume if it contains '-', it's a UUID, else handle
      if ((chatUUIDorHandle as string).includes("-")) {
        setSelectedChatUUID(chatUUIDorHandle as string, subIndex);
      } else {
        setSelectedHandle(chatUUIDorHandle as string, subIndex);
      }
    }
  }, [
    chatUUIDorHandle,
    sub,
    setSelectedChatUUID,
    setSelectedHandle,
    setSelectedSub,
  ]);

  useEffect(() => {
    return () => {
      const state = useActiveChatStore.getState();
      if (
        state.selectedChatUUID === chatUUIDorHandle ||
        state.selectedHandle === chatUUIDorHandle
      ) {
        state.clear();
      }
    };
  }, [chatUUIDorHandle]);

  const styles = useMemo(() => createStyle(theme), [theme]);

  // Verifica se i dati nel context appartengono effettivamente alla chat aperta nell'URL
  const isDataReady = useMemo(() => {
    return (
      selectedChatUUID === chatUUIDorHandle ||
      selectedHandle === chatUUIDorHandle
    );
  }, [selectedChatUUID, selectedHandle, chatUUIDorHandle]);

  // Se i dati non sono pronti o non corrispondono all'URL, mostriamo uno stato di caricamento
  // ma manteniamo la struttura per evitare salti visivi eccessivi
  if (!isDataReady) {
    return null;
  }

  // Prevent loading children like ChatContent if `chat` is totally missing
  if (!chat) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundChatContent,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <AppText
          style={{ color: theme.text, fontSize: 18 }}
          translationKey="chat.loading"
        />
      </View>
    );
  }

  const isJoinMode = !selectedChatUUID && !!selectedHandle;

  if (isJoinMode && chat) {
    return (
      <JoinCreateChat
        chat={chat}
        sub={params.sub as string}
        setSelectedHandle={setSelectedHandle}
        setSelectedChatUUID={setSelectedChatUUID}
      />
    );
  }

  const handleBulkReply = () => {
    if (selectedMessages.length === 0) return;
    setReplyingTo(selectedMessages.slice(-3));
    if (editingMessage) setNewMessageText("");
    setEditingMessage(null);
    setSelectedMessages([]);
  };

  const handleSetContentView = (view: "chat" | "vocal" | "both") => {
    if (view === "both" && setDetailWidth) {
      const cw = containerWidth || width;
      if (cw < 700) {
        // Force parent layout detail panel to expand to 700px
        setDetailWidth(Math.max(700, Math.min(width - 400, width * (2 / 3))));
      }
    }
    setContentView(view);
  };

  const renderContent = () => {
    switch (contentView) {
      case "chat":
        return <ChatContent />;
      case "vocal":
        return <VocalContent />;
      case "both":
        return (
          <View style={styles.splitContainer}>
            <View style={{ flex: 1, height: "100%", minWidth: CHAT_MIN }}>
              <ChatContent />
            </View>
            <View
              style={{
                width: vocalWidth,
                minWidth: VOCAL_MIN,
                height: "100%",
              }}
            >
              <VocalContent />
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.contentWrapper}>
      <Header
        chatUUIDorHandle={chatUUIDorHandle as string}
        contentView={contentView}
        setContentView={handleSetContentView}
        selectedMessages={selectedMessages}
        setSelectedMessages={setSelectedMessages}
        onBack={() => {
          setSelectedChatUUID(null);
          setSelectedHandle(null);
          router.push("/app");
        }}
        navToOverview={() => {
          router.push(`/app/chat/${chatUUIDorHandle}/${sub}/overview`);
        }}
        isSmallScreen={isSmallScreen}
        onReply={handleBulkReply}
        onForward={handleSelectedForward}
        onDelete={() => {
          setDeleteModalVisible(true);
        }}
      />
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {renderContent()}
      </View>
      <DeleteMessageModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDelete={() => {
          selectedMessages.forEach((msg: any) => handleDeleteMessage(msg.id));
          setSelectedMessages([]);
          setDeleteModalVisible(false);
        }}
        messageCount={selectedMessages.length}
        fullscreen={false}
        theme={theme}
      />
    </View>
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, overflow: "hidden" },
    contentWrapper: { flex: 1 },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    splitContainer: { flex: 1, flexDirection: "row" },
    splitPanel: { flex: 1, height: "100%" },
  });
}

export default React.memo(ChatPageRoute);
