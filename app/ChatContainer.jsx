import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "./components/SmartBackground"; // Assumi import da path corretto
import HeaderBase from "./components/HeaderBase";
import Icon from "./components/Icon";
import eventEmitter from "./utils/EventEmitter";

const ChatContainer = ({
  chatJoined,
  chatId,
  userId,
  chatName,
  onBack,
  onJoinSuccess,
  isSmallScreen, // Nuova prop da AppContainer per layout responsive
  theme, // Da AppContainer per stili
}) => {
  const [chatData, setChatData] = useState({
    messages: [],
    isJoined: false,
  });
  const [contentView, setContentView] = useState("chat"); // Gestito internamente ora

  const params = useLocalSearchParams();
  const styles = createStyle(theme);

  // useEffect per update chatData (da spostare in useSelectedChat hook)
  useEffect(() => {
    const updateChatData = async () => {
      if (chatId) {
        // Fetch common data used by both views (placeholder: implementa fetch reali)
        // Es. const messages = await localDatabase.fetchMessages(chatId);
        // const isJoined = await checkJoinStatus(chatId);
        setChatData((prev) => ({
          ...prev,
          messages: [], // Sostituisci con dati reali
          isJoined: chatJoined, // Usa prop per ora
        }));
      }
    };

    updateChatData();

    // Listener EventEmitter (da rimuovere in hook WebSocket)
    eventEmitter.on("chatDataUpdated", updateChatData);
    return () => eventEmitter.off("chatDataUpdated", updateChatData);
  }, [chatId, chatJoined]);

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
        {chatName || params.creatingChatWith || "Unknown Name"}
      </Text>
      {chatJoined && (
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
        return (
          <VocalContent chatId={chatId} userId={userId} chatData={chatData} />
        );
      case "chat":
      default:
        return (
          <ChatContent
            chatJoined={chatJoined}
            chatId={chatId}
            userId={userId}
            chatName={chatName}
            chatData={chatData}
            onBack={onBack}
            onJoinSuccess={onJoinSuccess}
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
                chatJoined={chatJoined}
                chatId={chatId}
                userId={userId}
                chatName={chatName}
                chatData={chatData}
                onBack={onBack}
                onJoinSuccess={onJoinSuccess}
                contentView="chat"
              />
            </View>
            <View style={{ flex: 1 }}>
              <VocalContent
                chatId={chatId}
                userId={userId}
                chatData={chatData}
              />
            </View>
          </View>
        );
    }
  };

  if (!chatId) return null; // Placeholder se no chat

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
