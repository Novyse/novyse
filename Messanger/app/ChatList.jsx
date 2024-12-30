import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  Image,
  Animated,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ChatContent from "./ChatContent"; // Adjust the path as needed

const ChatApp = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatDetails, setChatDetails] = useState({});
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get("window");
      setIsSmallScreen(width <= 768);
    };

    Dimensions.addEventListener("change", updateScreenSize);
    updateScreenSize();

    return () => {
      Dimensions.removeEventListener("change", updateScreenSize);
    };
  }, []);

  // Mock database functions
  const fetchLocalUserNameAndSurname = () => Promise.resolve("John Doe");
  const fetchChats = () =>
    Promise.resolve([
      { chat_id: "1", group_channel_name: "Group Chat 1" },
      { chat_id: "2", group_channel_name: "Group Chat 2" },
      { chat_id: "3", group_channel_name: "" },
    ]);
  const fetchUser = (chatId) =>
    Promise.resolve({ handle: `User for chat ${chatId}` });
  const fetchLastMessage = (chatId) =>
    Promise.resolve({
      text: `Last message for chat ${chatId}`,
      date_time: "2024-12-28T14:33:00",
    });

  useEffect(() => {
    fetchLocalUserNameAndSurname().then(setUserName);
    fetchChats().then(async (chats) => {
      const details = {};
      for (const chat of chats) {
        const user = await fetchUser(chat.chat_id);
        const lastMessage = await fetchLastMessage(chat.chat_id);
        details[chat.chat_id] = { user, lastMessage };
      }
      setChats(chats);
      setChatDetails(details);
    });
  }, []);

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const renderSidebar = () => (
    <Animated.View
      style={[
        styles.sidebar,
        isSidebarVisible ? styles.sidebarVisible : styles.sidebarHidden,
      ]}
    >
      <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
        <Icon name="close" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.sidebarText}>Menu Item 1</Text>
      <Text style={styles.sidebarText}>Menu Item 2</Text>
      <Text style={styles.sidebarText}>Menu Item 3</Text>
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {isSmallScreen && selectedChat ? (
        <TouchableOpacity
          onPress={() => setSelectedChat(null)}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>
        {isSmallScreen && selectedChat ? "Nome chat/utente" : ""}
      </Text>
    </View>
  );

  const renderChatList = () => (
    <View
      style={[styles.chatList, !isSmallScreen && styles.largeScreenChatList]}
    >
      <FlatList
        data={chats}
        keyExtractor={(item) => item.chat_id}
        renderItem={({ item }) => {
          const details = chatDetails[item.chat_id] || {};
          const user = details.user || {};
          const lastMessage = details.lastMessage || {};

          return (
            <TouchableOpacity
              style={[
                styles.chatItem,
                selectedChat === item.chat_id && styles.selected,
              ]}
              onPress={() => setSelectedChat(item.chat_id)}
            >
              <Image
                source={{ uri: "https://picsum.photos/200" }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.chatTitle}>
                  {item.group_channel_name || user.handle || "Unknown User"}
                </Text>
                <Text style={styles.chatSubtitle}>
                  {lastMessage.text || "No messages yet"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderChatContent = () => {
    const selectedDetails = chatDetails[selectedChat] || {};
    const user = selectedDetails.user || {};
    const lastMessage = selectedDetails.lastMessage || {};

    return (
      <View style={styles.chatContent}>
        {selectedChat && (
          <>
            {/* The back arrow and title should be part of ChatContent or directly here, not nested */}
            {isSmallScreen && selectedChat ? null : (
              <View
                style={[
                  styles.header,
                  isSmallScreen ? styles.mobileHeader : null,
                ]}
              >
                {/* <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity> */}
                <Text style={styles.headerTitle}>Chat with {user.handle}</Text>
              </View>
            )}

            <ChatContent
              chatId={selectedChat}
              userHandle={user.handle}
              lastMessage={lastMessage.text}
              dateTime={lastMessage.date_time}
              onBack={() => setSelectedChat(null)}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderSidebar()}
      {renderHeader()}
      <View style={styles.container}>
        {isSmallScreen && !selectedChat ? (
          renderChatList()
        ) : isSmallScreen && selectedChat ? (
          renderChatContent()
        ) : (
          <>
            {renderChatList()}
            {renderChatContent()}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  header: {
    height: 50,
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  menuButton: {
    marginRight: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  chatList: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
    flex: 1,
  },
  largeScreenChatList: {
    flex: 0.4,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  selected: {
    backgroundColor: "#d0d0d0",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  chatContent: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "#333",
    zIndex: 2,
    padding: 20,
  },
  sidebarVisible: {
    transform: [{ translateX: 0 }],
  },
  sidebarHidden: {
    transform: [{ translateX: -250 }],
  },
  sidebarText: {
    color: "#fff",
    marginVertical: 10,
  },
  backButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  mobileHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: {
    marginRight: 10,
  },
});

export default ChatApp;
