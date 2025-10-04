import React, { useState, useContext, useEffect } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "./components/SmartBackground"; // Assumi import da path corretto
import HeaderBase from "./components/HeaderBase";
import Icon from "./components/Icon";
import { useRouter } from "expo-router";

// Context
import { ChatContext } from "../context/ChatContext";

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
      {isSmallScreen && onBack && (
        <Icon
          name={"ArrowLeft02Icon"}
          onPress={onBack}
          style={styles.backButton}
        />
      )}
      <Image
        source={{ uri: "https://picsum.photos/200" }} // Placeholder avatar
        style={styles.avatar}
      />
      <Text style={styles.chatHeaderTitle} numberOfLines={1}>
        {selectedChatName}
      </Text>
      {contentView === "vocal" ? (
        <Icon
          name={"Message02Icon"}
          style={styles.moreButton}
          onPress={() => setContentView("chat")}
        />
      ) : (
        <Icon
          name={"AudioWave01Icon"}
          style={styles.moreButton}
          onPress={() => setContentView("vocal")}
        />
      )}

      {!isSmallScreen && (
        <Icon
          name={"Layout2ColumnIcon"}
          style={styles.moreButton}
          onPress={() => setContentView("both")}
        />
      )}
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
    backButton: {
      marginRight: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      marginRight: 10,
      borderRadius: 20,
    },
    chatHeaderTitle: {
      flex: 1,
      fontSize: 18,
      marginLeft: 10,
      color: theme?.text,
      fontWeight: "bold",
    },
    moreButton: {
      marginLeft: 12,
    },
    chatHeader: {
      width: "100%",
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomColor: theme?.backgroundDivider,
    },
  });
}

export default React.memo(ChatContainer);
