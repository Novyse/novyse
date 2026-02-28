import React, { useState, useContext, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  useWindowDimensions,
  PanResponder,
} from "react-native";

import ChatContent from "@/src/components/chat/content/Chat";
import Header from "@/src/components/chat/content/header";
import VocalContent from "@/src/components/comms/container";
import { useDetailStackContext } from "@/context/DetailStackContext";
import useResizerStorage from "@/src/hooks/ui/useResizerStorage";

import { useScreen } from "@/context/ScreenContext";
import { ChatContext } from "@/context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";

const ChatContainer = ({ navigation, route }) => {
  const { chatUUIDorHandle } = route.params || {};
  const onBack = () => navigation.goBack();
  const {
    selectedChatUUID,
    setSelectedChatUUID,
    selectedHandle,
    setSelectedHandle,
    selectedChatName,
    selectedChatPictureUUID,
  } = useContext(ChatContext);

  const { theme } = useContext(ThemeContext);
  const { isSmallScreen } = useScreen();
  const detailStackContext = useDetailStackContext();
  const setDetailWidth = detailStackContext?.setDetailWidth;
  const setMinDetailWidth = detailStackContext?.setMinDetailWidth;

  const [contentView, setContentView] = useState("chat");

  const [containerWidth, setContainerWidth] = useState(0);
  const { width } = useWindowDimensions();
  const [vocalWidth, setVocalWidth] = useResizerStorage(
    "@novyse_chat_vocal_width",
    Math.max(350, Math.min(width - 350, width / 2)),
    350,
  );

  const vocalWidthRef = React.useRef(vocalWidth);
  const startVocalWidthRef = React.useRef(vocalWidth);

  useEffect(() => {
    vocalWidthRef.current = vocalWidth;
  }, [vocalWidth]);

  useEffect(() => {
    // Determine effective container width for math, but handle zero-width initialization gracefully
    const cw = containerWidth || width;

    setVocalWidth((prev) => Math.max(350, Math.min(cw - 350, prev)));
  }, [containerWidth, width, contentView]);

  useEffect(() => {
    if (!setMinDetailWidth) return;

    if (contentView === "both") {
      setMinDetailWidth(700);
    } else {
      setMinDetailWidth(400); // Reset to default when leaving split view
    }

    // Cleanup when component unmounts to ensure we don't lock the app to 700px width forever
    return () => {
      setMinDetailWidth(400);
    };
  }, [contentView, setMinDetailWidth]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startVocalWidthRef.current = vocalWidthRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (evt, gestureState) => {
          const cw = containerWidth || width;
          setVocalWidth(
            Math.max(
              350,
              Math.min(cw - 350, startVocalWidthRef.current - gestureState.dx),
            ),
          );
        },
      }),
    [containerWidth, width],
  );

  useEffect(() => {
    if (chatUUIDorHandle) {
      // Assume if it contains '-', it's a UUID, else handle
      if (chatUUIDorHandle.includes("-")) {
        setSelectedChatUUID(chatUUIDorHandle);
      } else {
        setSelectedHandle(chatUUIDorHandle);
      }
      setContentView("chat");
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
          Loading {chatUUIDorHandle}...
        </Text>
      </View>
    );
  }

  const handleSetContentView = (view) => {
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
      case "vocal":
        return (
          <VocalContent
            navigation={navigation}
            chatUUIDorHandle={chatUUIDorHandle}
          />
        );
      case "both":
        return (
          <View
            style={styles.splitContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <View style={{ flex: 1, height: "100%", minWidth: 350 }}>
              <ChatContent onBack={onBack} contentView="chat" />
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
                {...panResponder.panHandlers}
              >
                <View style={styles.splitSeparator} />
              </View>
              <VocalContent
                navigation={navigation}
                chatUUIDorHandle={chatUUIDorHandle}
              />
            </View>
          </View>
        );
      case "chat":
      default:
        return <ChatContent onBack={onBack} contentView={contentView} />;
    }
  };

  return (
    <>
      <Header
        chatUUIDorHandle={chatUUIDorHandle}
        selectedChatName={selectedChatName}
        selectedChatPictureUUID={selectedChatPictureUUID}
        contentView={contentView}
        setContentView={handleSetContentView}
        navigation={navigation}
        isSmallScreen={isSmallScreen}
        onBack={onBack}
      />
      <View style={styles.contentWrapper}>{renderContent()}</View>
    </>
  );
};

function createStyle(theme, isSmallScreen) {
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

export default React.memo(ChatContainer);
