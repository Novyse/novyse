import React, { useState, useContext, useEffect } from "react";
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

const ChatContainer = ({ onBack, isSmallScreen, theme }) => {
  const {
    selectedChatUUID,
    selectedHandle,
    selectedChatName,
    selectedChatPictureUUID,
  } = useContext(ChatContext);

  const [contentView, setContentView] = useState("chat"); // "chat", "vocal", "both"
  const styles = createStyle(theme, isSmallScreen);
  const router = useRouter();

  // Render Header con pulsanti per switch view
  const renderChatHeader = () => (
    <HeaderBase style={styles.chatHeader}>
      {isSmallScreen && onBack && (
        <BlurredView>
          <Icon name={"ArrowLeft02Icon"} onPress={onBack} style={styles.icon} />
        </BlurredView>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Image
          source={{ uri: "https://picsum.photos/200" }} // Placeholder avatar
          style={styles.avatar}
        />
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
        {!isSmallScreen && contentView !== "both" &&(
          <Icon
            name={"Layout2ColumnIcon"}
            style={styles.icon}
            onPress={() => setContentView("both")}
          />
        )}
      </BlurredView>
    </HeaderBase>
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
            <View
              style={{
                flex: 1,
              }}
            >
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
    return (
      <Text
        style={{
          color: theme.text,
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          marginTop: 20,
        }}
        selectable={false}
      >
        La chat selezionata non esiste, cosa stai facendo, stai fermo per favore
      </Text>
    );
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
  return StyleSheet.create({
    chatContent: {
      flex: 1,
      position: "relative",
      
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 100,
    },
    chatInfoContainer: {
      height: 45,
      alignItems: "center",
      flexDirection: "row",
      paddingHorizontal: 10,
    },
    chatInfoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "700",
    },
    chatHeader: {
      padding: 0,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 10,
      paddingTop: isSmallScreen ? 0 : 5,
      zIndex: 105,
    },
  });
}

export default React.memo(ChatContainer);
