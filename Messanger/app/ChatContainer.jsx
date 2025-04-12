import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import { useLocalSearchParams } from "expo-router";
import eventEmitter from "./utils/EventEmitter";

const ChatContainer = ({
  chatJoined,
  chatId,
  userId,
  chatName,
  contentView = "chat",
  onBack,
  onJoinSuccess,
}) => {
  const [chatData, setChatData] = useState({
    messages: [],
    vocalMembers: [],
    isJoined: false,
  });

  // Listen for URL/router changes
  const params = useLocalSearchParams();

  useEffect(() => {
    // Update data when chat changes
    const updateChatData = async () => {
      if (chatId) {
        // Fetch common data used by both views
        // Update state accordingly
        setChatData((prev) => ({
          ...prev,
          // Update with new data
        }));
      }
    };

    updateChatData();

    // Listen for any updates that should refresh both views
    eventEmitter.on("chatDataUpdated", updateChatData);
    return () => eventEmitter.off("chatDataUpdated", updateChatData);
  }, [chatId]);

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
          />
        );
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatContainer;
