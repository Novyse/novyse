import React, { useState, useContext, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Text,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "../components/SmartBackground";
import HeaderBase from "../components/HeaderBase";
import Icon from "../components/Icon";
import BlurredView from "../components/BlurredView";
import Header from "../components/chat/content/Header";

import { ChatContext } from "@/context/ChatContext";
import { ThemeContext } from "@/context/ThemeContext";

const ChatContainer = ({ onBack }) => {
  const { chatUUIDorHandle } = useLocalSearchParams();
  const { selectedChatUUID, selectedHandle, selectedChatName, selectedChatPictureUUID } =
    useContext(ChatContext);
  const { theme } = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= 768;
  const [contentView, setContentView] = useState("chat");

  const styles = useMemo(
    () => createStyle(theme, isSmallScreen),
    [theme, isSmallScreen]
  );

  // Verifica se i dati nel context appartengono effettivamente alla chat aperta nell'URL
  const isDataReady = useMemo(() => {
    return (
      selectedChatUUID === chatUUIDorHandle ||
      selectedHandle === chatUUIDorHandle
    );
  }, [selectedChatUUID, selectedHandle, chatUUIDorHandle]);

  // Se i dati non sono pronti o non corrispondono all'URL, mostriamo uno stato vuoto
  // ma manteniamo la struttura per evitare salti visivi eccessivi
  if (!isDataReady) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundChatContentGradient?.[0] || "#000",
          },
        ]}
      />
    );
  }

  const renderContent = () => {
    switch (contentView) {
      case "vocal":
        return <VocalContent />;
      case "both":
        return (
          <View style={styles.splitContainer}>
            <View style={styles.splitPanel}>
              <ChatContent onBack={onBack} contentView="chat" />
            </View>
            <View style={styles.splitSeparator} />
            <View style={styles.splitPanel}>
              <VocalContent />
            </View>
          </View>
        );
      case "chat":
      default:
        return <ChatContent onBack={onBack} contentView={contentView} />;
    }
  };

  return (
    <SmartBackground
      colors={theme?.backgroundChatContentGradient}
      style={styles.container}
      isSmallScreen={isSmallScreen}
    >
      <Header
        selectedChatName={selectedChatName}
        selectedChatPictureUUID={selectedChatPictureUUID}
        contentView={contentView}
        setContentView={setContentView}
        isSmallScreen={isSmallScreen}
        onBack={onBack}
      />
      <View style={styles.contentWrapper}>{renderContent()}</View>
    </SmartBackground>
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
