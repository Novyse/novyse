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
  const styles = createStyle(theme);
  const router = useRouter();

  // Render Header con pulsanti per switch view
  const renderChatHeader = () => (
    <HeaderBase>
      <BlurredView>
        {isSmallScreen && onBack && (
          <Icon name={"ArrowLeft02Icon"} onPress={onBack} style={styles.icon} />
        )}
      </BlurredView>
      <BlurredView style={styles.chatInfoContainer}>
        <Image
          source={{ uri: "https://picsum.photos/200" }} // Placeholder avatar
          style={styles.avatar}
        />
        <Text style={styles.chatInfoText} numberOfLines={1} selectable={false}>
          {selectedChatName}
        </Text>
      </BlurredView>

      <BlurredView style={{ flexDirection: "row" }}>
        <Icon
          name={"Message02Icon"}
          style={styles.icon}
          onPress={() => setContentView("chat")}
        />

        <Icon
          name={"AudioWave01Icon"}
          style={styles.icon}
          onPress={() => setContentView("vocal")}
        />
        {!isSmallScreen && (
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
                borderRightWidth: 1,
                borderColor: theme.backgroundDivider,
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

function createStyle(theme) {
  return StyleSheet.create({
    chatContent: {
      flex: 1,
      padding: 0,
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 35,
      height: 35,
      marginRight: 10,
      borderRadius: 20,
    },
    chatInfoContainer: {
      height: 45,
      alignItems: "center",
      flexDirection: "row",
      paddingHorizontal: 5,
    },
    chatInfoText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "700",
    },
    chatHeader: {
      width: "100%",
      borderBottomWidth: 1,
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomColor: theme?.backgroundDivider,
    },
  });
}

export default React.memo(ChatContainer);
