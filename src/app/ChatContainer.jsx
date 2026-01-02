import React, { useState, useContext, useMemo } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { useRouter } from "expo-router";

import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "../components/SmartBackground";
import HeaderBase from "../components/HeaderBase";
import Icon from "../components/Icon";
import BlurredView from "../components/BlurredView";

import { ChatContext } from "@/context/ChatContext";

const ChatContainer = ({ onBack, isSmallScreen, theme }) => {
  const { selectedChatUUID, selectedHandle, selectedChatName } =
    useContext(ChatContext);
  const router = useRouter();
  const [contentView, setContentView] = useState("chat");

  // SOSTITUIRE QUESTI CON I DATI REALI
  const pinnedMessage = null;
  const voiceState = null;

  const hasPinnedMessage = !!pinnedMessage;
  const isVoiceActive = !!voiceState;
  const isHeaderExpanded = hasPinnedMessage || isVoiceActive;

  const activeRadius = isHeaderExpanded ? 15 : 100;

  const styles = useMemo(
    () => createStyle(theme, isSmallScreen),
    [theme, isSmallScreen]
  );

  if (!selectedChatUUID && !selectedHandle) return null;

  const renderMainRow = () => (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name={
            isSmallScreen && onBack ? "ArrowLeft02Icon" : "MoreVerticalIcon"
          }
          onPress={isSmallScreen && onBack ? onBack : () => {}}
          style={styles.iconButton}
        />
      </View>

      <View style={styles.headerCenter}>
        <Image
          source={{ uri: "https://picsum.photos/200" }}
          style={styles.avatar}
        />
        <Text style={styles.chatTitle} numberOfLines={1}>
          {selectedChatName}
        </Text>
      </View>

      <View style={styles.headerRight}>
        {contentView !== "chat" && (
          <Icon
            name="Message02Icon"
            style={styles.iconButton}
            onPress={() => setContentView("chat")}
          />
        )}
        {contentView !== "vocal" && (
          <Icon
            name="AudioWave01Icon"
            style={styles.iconButton}
            onPress={() => setContentView("vocal")}
          />
        )}
        {!isSmallScreen && contentView !== "both" && (
          <Icon
            name="BorderVerticalIcon"
            style={styles.iconButton}
            onPress={() => setContentView("both")}
          />
        )}
      </View>
    </View>
  );

  const renderPinnedRow = () => (
    <View style={styles.headerSecondaryRow}>
      <View style={styles.pinnedContainer}>
        <Text style={styles.pinnedText} numberOfLines={1}>
          📌 Messaggio importante fissato in alto
        </Text>
      </View>
    </View>
  );

  const renderVoiceControlRow = () => (
    <View style={styles.headerSecondaryRow}>
      <View style={styles.voiceControlContainer}>
        <Text style={{ color: theme.text }}>Voice Player / Waveform here</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <HeaderBase
        style={[styles.headerBase, { borderRadius: activeRadius }]}
      >
        <BlurredView
          style={[
            styles.headerColumnContainer,
            { borderRadius: activeRadius },
          ]}
        >
          {renderMainRow()}
          {hasPinnedMessage && renderPinnedRow()}
          {isVoiceActive && renderVoiceControlRow()}
        </BlurredView>
      </HeaderBase>
    </View>
  );

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
      {renderHeader()}
      <View style={styles.contentWrapper}>{renderContent()}</View>
    </SmartBackground>
  );
};

function createStyle(theme, isSmallScreen) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
    },
    contentWrapper: {
      flex: 1,
    },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    headerBase: {
      overflow: "hidden",
    },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      paddingBottom: 0,
    },
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_MAIN_HEIGHT,
      paddingHorizontal: 8,
      width: "100%",
    },
    headerLeft: {
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "center",
    },
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
    headerSecondaryRow: {
      width: "100%",
      paddingHorizontal: 12,
      paddingBottom: 8,
      justifyContent: "center",
    },
    pinnedContainer: {
      backgroundColor: "rgba(0,0,0,0.05)",
      padding: 6,
      borderRadius: 8,
      width: "100%",
    },
    voiceControlContainer: {
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 12,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: theme.placeholder || "#ccc",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    pinnedText: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.9,
    },
    splitContainer: {
      flex: 1,
      flexDirection: "row",
    },
    splitPanel: {
      flex: 1,
      height: "100%",
    },
    splitSeparator: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      height: "100%",
    },
  });
}

export default React.memo(ChatContainer);