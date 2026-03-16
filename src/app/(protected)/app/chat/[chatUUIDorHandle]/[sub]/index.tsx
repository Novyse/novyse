import React, { useState, useContext, useMemo, useEffect } from "react";
import { View, StyleSheet, Text, useWindowDimensions } from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import ChatContent from "@/src/components/chat/content/Chat";
import Header from "@/src/components/chat/content/header";
import VocalContent from "@/src/components/comms/container";

import { useScreen } from "@/context/ScreenContext";
import { useActiveChatStore } from "@/context/ActiveChatContext";
import { ThemeContext } from "@/context/ThemeContext";
import useChatStore from "@/context/ChatContext";
import useWindowSizeStore from "@/context/WindowSizeContext";

import { usePanelResizer } from "@/src/hooks/layout/usePanelResizer";
import useMessageHandlers from "@/src/hooks/chat/useMessageHandlers";
import DeleteMessageModal from "@/src/components/modalSheets/DeleteMessage";

const ChatPageRoute = () => {
  const params = useLocalSearchParams();
  const { chatUUIDorHandle } = params;

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
  const newMessageText = useActiveChatStore((state) => state.newMessageText);
  const editingMessage = useActiveChatStore((state) => state.editingMessage);
  const setEditingMessage = useActiveChatStore(
    (state) => state.setEditingMessage,
  );

  const chat = useActiveChatStore((state) => state.activeChatData);

  const { handleDeleteMessage } = useMessageHandlers(
    newMessageText,
    setNewMessageText,
    setEditingMessage,
  );

  const { theme } = useContext(ThemeContext);
  const { isSmallScreen } = useScreen();

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
  });

  useEffect(() => {
    // Determine effective container width for math, but handle zero-width initialization gracefully
    const cw = containerWidth || width;
    setVocalWidth((prev) => Math.max(350, Math.min(cw - 350, prev)));
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

  useEffect(() => {
    if (chatUUIDorHandle) {
      const state = useActiveChatStore.getState();
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
  }, [chatUUIDorHandle, setSelectedChatUUID, setSelectedHandle]);

  const styles = useMemo(
    () => createStyle(theme, isSmallScreen),
    [theme, isSmallScreen],
  );

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
            backgroundColor: theme.backgroundChatContentGradient?.[0] || "#000",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          Fetching chat data...
        </Text>
      </View>
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
              <View
                //@ts-ignore
                style={{
                  position: "absolute",
                  left: -10,
                  top: 0,
                  bottom: 0,
                  width: 20,
                  backgroundColor: "transparent",
                  cursor: "ew-resize",
                  zIndex: 10,
                  alignItems: "center",
                }}
                {...resizerHandlers}
              >
                <View style={styles.splitSeparator} />
              </View>
              <VocalContent />
            </View>
          </View>
        );
    }
  };

  return (
    <>
      <Header
        chatUUIDorHandle={chatUUIDorHandle as string}
        contentView={contentView}
        setContentView={handleSetContentView}
        selectedMessages={selectedMessages}
        setSelectedMessages={setSelectedMessages}
        onBack={() => {
          setSelectedChatUUID(null);
          setSelectedHandle(null);
          //@ts-ignore
          router.push("/app");
        }}
        isSmallScreen={isSmallScreen}
        onReply={handleBulkReply}
        onForward={() => {}}
        onDelete={() => {
          setDeleteModalVisible(true);
        }}
      />
      <View style={styles.contentWrapper}>{renderContent()}</View>
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
    </>
  );
};

function createStyle(theme: any, isSmallScreen: boolean) {
  return StyleSheet.create({
    container: { flex: 1, overflow: "hidden" },
    contentWrapper: { flex: 1 },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    headerBase: { overflow: "hidden", borderRadius: 100 },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      borderRadius: 100,
    },
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 55,
      paddingHorizontal: 8,
      width: "100%",
    },
    headerLeft: { flex: 1, alignItems: "flex-start", justifyContent: "center" },
    headerCenter: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    iconButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: "#ccc",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    splitContainer: { flex: 1, flexDirection: "row" },
    splitPanel: { flex: 1, height: "100%" },
    splitSeparator: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      height: "100%",
    },
  });
}

export default React.memo(ChatPageRoute);
