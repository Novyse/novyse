import React, { useState, useContext } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "./components/SmartBackground"; // Assumi import da path corretto
import HeaderBase from "./components/HeaderBase";
import Icon from "./components/Icon";

// Hooks
import useChatData from "./hooks/useChatData.js";

// Context
import { ChatContext } from "../context/ChatContext";

const ChatContainer = ({ onBack, isSmallScreen, theme }) => {
  const { selectedChatUUID, selectedHandle } = useContext(ChatContext);

  const { chat, messages, setMessages } = useChatData(
    selectedChatUUID,
    selectedHandle
  );
  console.log("Chat data in ChatContainer:", chat);
  console.log("Messages data in ChatContainer:", messages);

  const [contentView, setContentView] = useState("chat"); // "chat", "vocal", "both"
  const styles = createStyle(theme);

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
      <Text style={[styles.headerTitle, styles.chatHeaderTitle]}>
        {chat.name}
      </Text>
      {true && (
        <>
          <Icon
            name={"Message02Icon"}
            style={styles.moreButton}
            onPress={() => setContentView("chat")}
          />
          <Icon
            name={"AudioWave01Icon"}
            style={styles.moreButton}
            onPress={() => setContentView("vocal")}
          />
          {!isSmallScreen && (
            <Icon
              name={"Layout2ColumnIcon"}
              style={styles.moreButton}
              onPress={() => setContentView("both")}
            />
          )}
        </>
      )}
    </HeaderBase>
  );

  const renderContent = () => {
    switch (contentView) {
      case "vocal":
        return <VocalContent chatUUID={chat.uuid} />;
      case "chat":
      default:
        return (
          <ChatContent
            chat={chat}
            messages={messages}
            setMessages={setMessages}
            onBack={onBack}
            contentView={contentView}
          />
        );
      case "both":
        return (
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View
              style={{
                flex: 1,
                borderRightWidth: 1,
                borderColor: theme.chatDivider,
              }}
            >
              <ChatContent
                chat={chat}
                messages={messages}
                setMessages={setMessages}
                onBack={onBack}
                contentView="chat"
              />
            </View>
            <View style={{ flex: 1 }}>
              <VocalContent chatUUID={chat.uuid} />
            </View>
          </View>
        );
    }
  };

  return (
    <SmartBackground
      colors={theme?.backgroundChatGradient}
      style={styles.chatContent}
      isSmallScreen={isSmallScreen}
    >
      {renderChatHeader()}
      {renderContent()}
    </SmartBackground>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    chatContent: {
      padding: 0,
      flex: 1,
    },
    backButton: {
      marginRight: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    headerTitle: {
      color: theme?.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    chatHeaderTitle: {
      marginLeft: 20,
      flex: 1,
      textAlign: "left",
    },
    moreButton: {
      marginLeft: 12,
    },
    // Espandi con altri stili se necessario
    chatHeader: {
      borderBottomColor: theme?.chatDivider,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
  });
}

export default React.memo(ChatContainer);
