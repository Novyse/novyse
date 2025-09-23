import React, { useState, useEffect } from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import SmartBackground from "./components/SmartBackground"; // Assumi import da path corretto
import HeaderBase from "./components/HeaderBase";
import Icon from "./components/Icon";
import eventEmitter from "./utils/EventEmitter";
import gateway from "./utils/backend-services/api-gateway";
import Database from "./utils/storage/database";

const ChatContainer = ({
  chatUUID,
  chatHandle,
  chatName,
  chatType,
  chatProfilePictureUUID,
  onBack,
  isSmallScreen,
  theme,
}) => {
  const [contentView, setContentView] = useState("chat"); // "chat", "vocal", "both"
  const [messages, setMessages] = useState([]);
  const styles = createStyle(theme);

  // da spostare in hook immagino
  useEffect(() => {
    const initMessages = async () => {
      if (chatUUID) {
        const database = await Database.create();
        const messages = await database.getMessagesByChatUUID(chatUUID);
        setMessages((prev) => ({ ...prev, messages: messages || [] }));
      } else {
        if (chatHandle) {
          const { success, data } = await gateway.gather.handle(chatHandle);
          if (success) {
            const { type, profilePictureUUID } = data;
            let name = "Unknown";

            switch (chatType) {
              case "USER":
                name = `${data.name} ${data.surname}`;
                break;
              case "GROUP":
              case "CHANNEL":
              case "FORUM":
                name = data.name;
                setMessages((prev) => ({
                  ...prev,
                  messages: data.messages || [],
                }));
                break;
              case "BOT":
                chatName = data.name;
                chatType = "BOT";
                break;
              default:
                name = "Unknown";
            }

            chatName = name;
            chatType = type;
            chatProfilePictureUUID = profilePictureUUID;
          }
        }
      }
    };
    initMessages();
  }, [chatUUID]);

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
        {chatName || "Unknown"}
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
        return <VocalContent chatUUID={chatUUID} />;
      case "chat":
      default:
        return (
          <ChatContent
            chatUUID={chatUUID}
            chatHandle={chatHandle}
            chatName={chatName}
            chatType={chatType}
            chatProfilePictureUUID={chatProfilePictureUUID}
            messages={messages}
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
                chatUUID={chatUUID}
                chatHandle={chatHandle}
                chatName={chatName}
                chatType={chatType}
                chatProfilePictureUUID={chatProfilePictureUUID}
                messages={messages}
                onBack={onBack}
                contentView="chat"
              />
            </View>
            <View style={{ flex: 1 }}>
              <VocalContent chatUUID={chatUUID} />
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
