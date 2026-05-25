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
import Header from "@/src/components/chat/content/header";
import VocalContent from "@/src/components/comms/container";

import { useScreen } from "@/src/context/ScreenContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import { ThemeContext } from "@/src/context/ThemeContext";
import useWindowSizeStore from "@/src/context/WindowSizeContext";

import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import PanelResizeHandle from "@/src/components/layout/PanelResizeHandle";
import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers";
import { useForward } from "@/src/hooks/chat/useForward";

import DeleteMessageModal from "@/src/components/modalSheets/DeleteMessage";
import JoinCreateChat from "@/src/components/chat/JoinCreateChat";
import AppText from "@/src/components/AppText";

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

  const chat = useActiveChatStore((state) => state.activeChatData);

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

  const { vocalWidth, setVocalWidth, setDetailWidth, setMinDetailWidth } =
    useWindowSizeStore();

  const resizerHandlers = usePanelResizer({
    currentWidth: vocalWidth,
    setWidth: setVocalWidth,
    minWidth: 350,
    maxWidthPadding: 350,
    containerWidth: containerWidth || undefined,
  });

  useEffect(() => {
    // Determine effective container width for math, but handle zero-width initialization gracefully
    const cw = containerWidth || width;
    const maxVocal = cw - 350;
    setVocalWidth((prev) => Math.max(350, Math.min(maxVocal, prev)));
  }, [containerWidth, width, contentView, setVocalWidth]);

  useEffect(() => {
    if (!setMinDetailWidth) return;
    if (contentView === "both") {
      setMinDetailWidth(700);
    } else {
      setMinDetailWidth(400);
    }
    return () => {
      setMinDetailWidth(400);
    };
  }, [contentView, setMinDetailWidth]);

  // Auto-collapse split view when window is too narrow
  useEffect(() => {
    if (contentView === "both" && (isSmallScreen || isMediumScreen)) {
      setContentView("chat");
    }
  }, [isSmallScreen, isMediumScreen, contentView, setContentView]);

  useEffect(() => {
    if (chatUUIDorHandle) {
      const state = useActiveChatStore.getState();

      const subIndex = params.sub ? parseInt(params.sub as string, 10) : 0;
      if (state.selectedSub !== subIndex) {
        setSelectedSub(subIndex);
      }

      if (
        chatUUIDorHandle === state.selectedChatUUID ||
        chatUUIDorHandle === state.selectedHandle
      )
        return;

      // Assume if it contains '-', it's a UUID, else handle
      if ((chatUUIDorHandle as string).includes("-")) {
        setSelectedChatUUID(chatUUIDorHandle as string);
      } else {
        setSelectedHandle(chatUUIDorHandle as string);
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
      useActiveChatStore.getState().clear();
    };
  }, []);

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
          <View
            style={styles.splitContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <View style={{ flex: 1, height: "100%", minWidth: 350 }}>
              <ChatContent />
            </View>
            <View
              style={{
                width: vocalWidth,
                minWidth: 350,
                height: "100%",
                position: "relative",
              }}
            >
              <PanelResizeHandle panHandlers={resizerHandlers} />
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
      {renderContent()}
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
