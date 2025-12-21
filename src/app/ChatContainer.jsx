import React, { useState, useContext } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "../components/SmartBackground";
import HeaderBase from "../components/HeaderBase";
import Icon from "../components/Icon";
import { useRouter } from "expo-router";
import BlurredView from "../components/BlurredView";

// Context
import { ChatContext } from "@/context/ChatContext";
import PinnedMessages from "../components/chat/container/PinnedMessages";
import AudioHeaderContainer from "../components/chat/container/AudioHeaderContainer";

const ChatContainer = ({ onBack, isSmallScreen, theme }) => {
  const { selectedChatUUID, selectedHandle, selectedChatName } =
    useContext(ChatContext);

  const [contentView, setContentView] = useState("chat");
  const styles = createStyle(theme, isSmallScreen);
  const router = useRouter();

  const renderChatHeader = () => (
    <View style={styles.headerWrapper}>
      <HeaderBase style={styles.chatHeader}>
        {/* SX */}
        {isSmallScreen && onBack ? (
          <BlurredView>
            <Icon
              name={"ArrowLeft02Icon"}
              onPress={onBack}
              style={styles.icon}
            />
          </BlurredView>
        ) : (
          <BlurredView>
            <Icon
              name={"MoreVerticalIcon"}
              onPress={() => {}}
              style={styles.icon}
            />
          </BlurredView>
        )}

        {/* CENTRO: Wrapper Relativo */}
        <View style={styles.chatTitleWrapper}>
          {/* Livello 1 (Sopra): L'Avatar */}
          <Image
            source={{ uri: "https://picsum.photos/200" }}
            style={styles.avatar}
          />

          {/* Livello 2 (Sotto): Il Nome */}
          <BlurredView style={styles.chatInfoContainer}>
            <Text
              style={styles.chatInfoText}
              numberOfLines={1}
              selectable={false}
            >
              {selectedChatName}
            </Text>
          </BlurredView>
        </View>

        {/* DX */}
        <BlurredView style={{ flexDirection: "row" }}>
          {contentView !== "chat" && (
            <Icon
              name={"Message02Icon"}
              style={styles.icon}
              onPress={() => setContentView("chat")}
            />
          )}
          {contentView !== "vocal" && (
            <Icon
              name={"AudioWave01Icon"}
              style={styles.icon}
              onPress={() => setContentView("vocal")}
            />
          )}
          {!isSmallScreen && contentView !== "both" && (
            <Icon
              name={"BorderVerticalIcon"}
              style={styles.icon}
              onPress={() => setContentView("both")}
            />
          )}
        </BlurredView>
      </HeaderBase>

      {/* <PinnedMessages isSmallScreen={isSmallScreen}/> */}
      <AudioHeaderContainer isSmallScreen={isSmallScreen} />
    </View>
  );

  const renderContent = () => {
    switch (contentView) {
      case "vocal":
        return <VocalContent />;
      case "chat":
      default:
        return <ChatContent onBack={onBack} contentView={contentView} />;
      case "both":
        return (
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <ChatContent onBack={onBack} contentView="chat" />
            </View>
            <View style={{ flex: 1 }}>
              <VocalContent />
            </View>
          </View>
        );
    }
  };

  if (!selectedChatUUID && !selectedHandle) {
    return;
  } else {
    return (
      <SmartBackground
        colors={theme?.backgroundChatContentGradient}
        style={styles.chatContent}
        isSmallScreen={isSmallScreen}
      >
        {renderChatHeader()}
        {renderContent()}
      </SmartBackground>
    );
  }
};

function createStyle(theme, isSmallScreen) {
  const ITEM_SIZE = 45;

  return StyleSheet.create({
    chatContent: {
      flex: 1,
      position: "relative",
    },
    icon: {
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 105,
      paddingHorizontal: 10,
    },
    chatHeader: {
      padding: 0,
      paddingTop: isSmallScreen ? 0 : 5,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      zIndex: 10,
    },
    chatTitleWrapper: {
      position: "relative",
      height: ITEM_SIZE,
      width: ITEM_SIZE,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    avatar: {
      width: ITEM_SIZE,
      height: ITEM_SIZE,
      borderRadius: 100,
      zIndex: 20,
    },
    chatInfoContainer: {
      position: "absolute",
      top: 38,
      alignSelf: "center",
      height: 35,
      paddingHorizontal: 16,
      paddingTop: 4,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 140,
      zIndex: 10,
    },
    chatInfoText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}

export default React.memo(ChatContainer);
