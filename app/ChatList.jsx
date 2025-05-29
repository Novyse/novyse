import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  Image,
  Animated,
  BackHandler,
  Alert,
} from "react-native";
import moment from "moment";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import NetInfo from "@react-native-community/netinfo";
import Icon from "react-native-vector-icons/MaterialIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import CreateGroupModal from "./components/CreateGroupModal";
import SidebarItem from "./components/SidebarItem";

import Search from "./Search";
import APIMethods from "./utils/APImethods";
import eventEmitter from "./utils/EventEmitter";
import WebSocketMethods from "./utils/webSocketMethods";
import localDatabase from "./utils/localDatabaseMethods";
import ChatContainer from "./ChatContainer";

import { HugeiconsIcon } from "@hugeicons/react-native";
import { Menu02Icon, Search02Icon, Clock01Icon } from "@hugeicons/core-free-icons";

const ChatList = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isToggleSearchChats, setIsToggleSearchChats] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [isCreateGroupModalVisible, setIsCreateGroupModalVisible] =
    useState(false);
  // se un utente ha accesso alla chat/gruppo, quindi per capire se mostrare la barra per mandare i messaggi oppure un pulsante join chat/group
  const [chatJoined, setChatJoined] = useState(true);

  const router = useRouter();
  const params = useLocalSearchParams();
  const [chats, setChats] = useState([]);
  const [userId, setUserId] = useState("");
  const [chatDetails, setChatDetails] = useState({});
  const [contentView, setContentView] = useState("chat");

  // importo stile e temi colori
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [sidebarPosition] = useState(new Animated.Value(-250));
  const [chatContentPosition] = useState(
    new Animated.Value(Dimensions.get("window").width)
  );

  // First useEffect - runs only once for initialization
  useEffect(() => {
    const checkLogged = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (isLoggedIn === "true") {
        const localUserId = await localDatabase.fetchLocalUserID();
        setUserId(localUserId);
      } else {
        logout();
      }
    };
    checkLogged();

    // Initialize WebSocket
    WebSocketMethods.openWebSocketConnection();

    // Set up event listeners
    const handleNewMessageSent = (data) => {
      const { chat_id, text, date } = data;
      setChatDetails((current) => ({
        ...current,
        [chat_id]: {
          ...current[chat_id],
          lastMessage: {
            ...current[chat_id]?.lastMessage,
            text: text !== null ? text : current[chat_id]?.lastMessage?.text,
            date_time: date,
          },
        },
      }));
    };

    const handleSearchResult = (data) => {
      const { handle, type } = data;
      const tempChatId = `temp_${handle}_${Date.now()}`;
      setChatJoined(type !== "group");
      setSelectedChat(tempChatId);
    };

    const updateChatsAndDetails = async (data) => {
      const newChatId = data?.newChatId;
      try {
        const fetchedChats = await fetchChats();
        const details = {};
        for (const chat of fetchedChats) {
          const user = await fetchUser(chat.chat_id);
          const lastMessage = await fetchLastMessage(chat.chat_id);
          details[chat.chat_id] = {
            user,
            lastMessage,
            group_channel_name: chat.group_channel_name,
          };
        }

        setChats(fetchedChats);
        setChatDetails(details);
        if (newChatId) {
          setSelectedChat(newChatId);
        }
      } catch (error) {
        console.error("Error updating chats:", error);
      }
    };

    // Add event listeners
    eventEmitter.on("updateNewLastMessage", handleNewMessageSent);
    eventEmitter.on("newChat", updateChatsAndDetails);
    eventEmitter.on("searchResultSelected", handleSearchResult);

    // Initial fetch
    updateChatsAndDetails();

    // Cleanup function
    return () => {
      eventEmitter.off("updateNewLastMessage", handleNewMessageSent);
      eventEmitter.off("newChat", updateChatsAndDetails);
      eventEmitter.off("searchResultSelected", handleSearchResult);
    };
  }, []); // Empty dependency array means it runs only once

  // Second useEffect - handles network status and back button
  useEffect(() => {
    const checkConnection = NetInfo.addEventListener((state) => {
      setNetworkAvailable(state.isConnected);
    });

    const backAction = () => {
      if (isSmallScreen && selectedChat) {
        setSelectedChat(null);
        return true;
      }
      Alert.alert("Attenzione", "Sei sicuro di voler uscire?", [
        { text: "No", style: "cancel" },
        { text: "Sì", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      backHandler.remove();
      checkConnection();
    };
  }, [isSmallScreen, selectedChat]); // Only re-run when these values change

  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get("window");
      setIsSmallScreen(width <= 768);
    };
    Dimensions.addEventListener("change", updateScreenSize);
    updateScreenSize();

    if (!isSmallScreen && params.chatId) {
      setSelectedChat(params.chatId);
    }
  }, [params.chatId]);

  useEffect(() => {
    if (isSmallScreen) {
      Animated.timing(chatContentPosition, {
        toValue: selectedChat ? 0 : Dimensions.get("window").width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChat, isSmallScreen]);

  //logout dall'app sia locale (elimina DB) che remoto (API)
  const logout = async () => {
    await localDatabase.clearDatabase();
    const loggedOutFromAPI = await APIMethods.logoutAPI();
    if (loggedOutFromAPI) {
      console.log("Logout dall'API completato");
    }
    router.navigate("/loginSignup/EmailCheckForm");
  };

  // viene richiamata nello useEffect, serve per ottenere le chat dal DB locale
  const fetchChats = () =>
    localDatabase.fetchChats().then((chats) =>
      chats.map((chat) => ({
        chat_id: chat.chat_id,
        group_channel_name: chat.group_channel_name || "",
      }))
    );

  // viene richiamata nello useEffect, serve per ottenere gli user dal DB locale
  const fetchUser = (chatId) =>
    localDatabase.fetchUser(chatId).then((handle) => ({ handle }));

  // viene richiamata nello useEffect, serve per ottenere l'ultimo messaggio dal DB locale
  const fetchLastMessage = (chatId) =>
    localDatabase.fetchLastMessage(chatId).then((row) => {
      return row;
    });

  // apre / chiude la sidebar
  const toggleSidebar = () => {
    Animated.timing(sidebarPosition, {
      toValue: isSidebarVisible ? -250 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSidebarVisible(!isSidebarVisible);
      setOverlayVisible(!isSidebarVisible);
    });
  };

  // Quando una chat nella lista di quelle salvate viene premuta
  const handleChatPress = (chatId) => {
    setChatJoined(true);
    setSelectedChat(chatId);
    setContentView("chat");
    if (!isSmallScreen) {
      router.setParams({ chatId });
    }
    router.setParams({ chatId: chatId, creatingChatWith: undefined });
  };

  // trasforma la data in un formato HH:MM
  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  //Setting Menu
  const handleSettingsPress = () => {
    router.navigate("/settings/SettingsMenu");
  };

  //gestisce se mostrare join oppure bottomBar in ChatContent
  const handleSuccessfulJoin = (newChatId) => {
    console.log(
      `ChatList: Gruppo ${newChatId} joinato con successo. Aggiorno lo stato.`
    );
    setChatJoined(true);
    // Potrebbe essere utile anche aggiornare selectedChat qui,
    // se la navigazione non lo fa già implicitamente
    setSelectedChat(newChatId);
  };

  const renderSidebar = () => (
    <>
      {overlayVisible && (
        <Pressable style={styles.overlay} onPress={toggleSidebar} />
      )}
      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: sidebarPosition }] },
        ]}
      >
        <View style={styles.profileContainer}>
          <View style={styles.avatar} />
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>Nome Cognome</Text>
            <Text style={styles.profilePhone}>+39 1234567890</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          <SidebarItem
            text="Profile"
            iconName="person"
            onPress={() => {
              toggleSidebar();
            }}
          />
          <SidebarItem
            text="Settings"
            iconName="settings"
            onPress={() => {
              toggleSidebar();
              handleSettingsPress();
            }}
          />
          <SidebarItem
            text="Nuovo Gruppo"
            iconName="people"
            onPress={() => {
              toggleSidebar();
              setIsCreateGroupModalVisible(true);
            }}
          />
          <SidebarItem
            text="Logout"
            iconName="logout"
            onPress={() => {
              toggleSidebar();
              AsyncStorage.setItem("isLoggedIn", "false");
              logout();
            }}
          />
        </View>
      </Animated.View>
    </>
  );

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Pressable onPress={toggleSidebar} style={styles.menuButton}>
          <HugeiconsIcon
            icon={Menu02Icon}
            size={36}
            color={theme.icon}
            strokeWidth={1.5}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Chats</Text>
        <Pressable
          onPress={() => {
            // router.navigate("/Search");
            isToggleSearchChats
              ? setIsToggleSearchChats(false)
              : setIsToggleSearchChats(true);
          }}
          style={styles.searchButton}
        >
          <HugeiconsIcon
            icon={Search02Icon}
            size={36}
            color={theme.icon}
            strokeWidth={1.5}
          />
        </Pressable>
      </View>
    );
  };

  const renderChatList = () => (
    <View
      style={[
        styles.chatList,
        { padding: 10, paddingTop: 0 },
        !isSmallScreen && styles.largeScreenChatList,
      ]}
    >
      <FlatList
        data={chats}
        keyExtractor={(item) => item.chat_id}
        renderItem={({ item }) => {
          // Usa chatDetails invece di accedere direttamente a item
          const details = chatDetails[item.chat_id] || {};
          const user = details.user || {};
          const lastMessage = details.lastMessage || {};
          const lastMessageDate = parseTime(lastMessage.date_time);
          // Priorità a group_channel_name, poi user.handle
          const chatName =
            details.group_channel_name || user.handle || "Unknown User";

          return (
            <Pressable
              style={[
                styles.chatItem,
                selectedChat === item.chat_id && styles.selected,
              ]}
              onPress={() => handleChatPress(item.chat_id)}
            >
              <Image
                source={{ uri: "https://picsum.photos/200" }}
                style={styles.avatar}
              />
              <View style={styles.chatItemGrid}>
                <View style={styles.leftContainer}>
                  <Text
                    style={[
                      styles.chatTitle,
                      styles.gridText,
                      { marginBottom: 5 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {chatName}
                  </Text>
                  <Text
                    style={[styles.chatSubtitle, styles.gridText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lastMessage.text || "No messages yet"}
                  </Text>
                </View>
                <View style={styles.rightContainer}>
                  <Text
                    style={[
                      styles.chatDate,
                      styles.gridText,
                      { marginBottom: 5 },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lastMessageDate === "" ? (
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={14}
                        color={theme.icon}
                        strokeWidth={1.5}
                      />
                    ) : (
                      lastMessageDate
                    )}
                  </Text>
                  <Text style={[styles.staticNumber, styles.gridText]}>
                    123
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );

  const renderChatHeaderAndContent = () => {
    if (!selectedChat) return null;
    const selectedDetails = chatDetails[selectedChat] || {};
    const user = selectedDetails.user || {};
    const group_channel_name = selectedDetails.group_channel_name || "";
    const chatName =
      group_channel_name ||
      user.handle ||
      params.creatingChatWith ||
      "Unknown Name";

    const renderChatHeader = (
      <View style={[styles.header, styles.chatHeader]}>
        {isSmallScreen && (
          <Pressable
            onPress={() => setSelectedChat(null)}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={theme.icon} />
          </Pressable>
        )}
        <Image
          source={{ uri: "https://picsum.photos/200" }}
          style={styles.avatar}
        />
        <Text style={[styles.headerTitle, styles.chatHeaderTitle]}>
          {chatName}
        </Text>
        <Pressable
          style={styles.moreButton}
          onPress={() => setIsMenuVisible(!isMenuVisible)}
        >
          <Icon name="more-vert" size={24} color={theme.icon} />
        </Pressable>
        {isMenuVisible && (
          <View style={styles.dropdownMenu}>
            <Pressable
              onPress={() => {
                setContentView("chat");
                setIsMenuVisible(false);
              }}
            >
              <Text style={styles.dropdownItem}>Chat View</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setContentView("vocal");
                setIsMenuVisible(false);
              }}
            >
              <Text style={styles.dropdownItem}>Vocal View</Text>
            </Pressable>
            {!isSmallScreen && (
              <Pressable
                onPress={() => {
                  setContentView("both");
                  setIsMenuVisible(false);
                }}
              >
                <Text style={styles.dropdownItem}>Split View</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );

    // In renderChatHeaderAndContent:
    switch (contentView) {
      case "vocal":
      case "chat":
        return (
          <View style={styles.chatContent}>
            {renderChatHeader}
            <ChatContainer
              chatJoined={chatJoined}
              chatId={selectedChat}
              userId={userId}
              chatName={chatName}
              contentView={contentView}
              onBack={() => setSelectedChat(null)}
              onJoinSuccess={handleSuccessfulJoin}
            />
          </View>
        );
      case "both":
        return (
          <View style={styles.chatContent}>
            {renderChatHeader}
            <View style={{ flex: 1, flexDirection: "row" }}>
              <View
                style={{
                  flex: 1,
                  borderRightWidth: 1,
                  borderColor: theme.chatDivider,
                }}
              >
                <ChatContainer
                  chatId={selectedChat}
                  userId={userId}
                  chatName={chatName}
                  contentView="chat"
                  onBack={() => setSelectedChat(null)}
                  onJoinSuccess={handleSuccessfulJoin}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ChatContainer
                  chatId={selectedChat}
                  userId={userId}
                  chatName={chatName}
                  contentView="vocal"
                  onBack={() => setSelectedChat(null)}
                  onJoinSuccess={handleSuccessfulJoin}
                />
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1b2734" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        {renderSidebar()}
        {!isSmallScreen || (isSmallScreen && !selectedChat)
          ? renderHeader()
          : null}
        <View style={styles.container}>
          {isSmallScreen ? (
            <>
              {!isToggleSearchChats ? (
                <View style={styles.chatList}>{renderChatList()}</View>
              ) : (
                <Search style={styles.chatList} />
              )}
              {selectedChat && (
                <Animated.View
                  style={[
                    styles.chatContent,
                    {
                      transform: [{ translateX: chatContentPosition }],
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1,
                    },
                  ]}
                >
                  {renderChatHeaderAndContent()}
                </Animated.View>
              )}
            </>
          ) : (
            <>
              {!isToggleSearchChats ? (
                renderChatList()
              ) : (
                <View style={[styles.chatList, styles.largeScreenChatList]}>
                  <Search />
                </View>
              )}
              {renderChatHeaderAndContent()}
            </>
          )}
        </View>
        <CreateGroupModal
          visible={isCreateGroupModalVisible}
          onClose={() => setIsCreateGroupModalVisible(false)}
        />
        {!networkAvailable && (
          <Text style={styles.connectionInfoContainer}>
            Network Status: Not Connected
          </Text>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default ChatList;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.backgroundClassic,
      flex: 1,
      overflow: "hidden", // Important: Add this to the SafeAreaView
    },
    container: {
      flex: 1,
      flexDirection: "row",
      overflow: "hidden", // Important: Add this to the container
    },
    chatList: {
      backgroundColor: theme.backgroundChatList,
      flex: 1, // For small screens, it takes full width
      minWidth: 330, // Minimum width to prevent shrinking
    },
    largeScreenChatList: {
      flex: 0, // Override flex: 1 for large screens
      width: 330, // Fixed width for large screens
      borderRightWidth: 1,
      borderRightColor: theme.chatDivider,
    },
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: theme.backgroundChatInsideList,
      borderRadius: 13,
      marginBottom: 10,
    },
    selected: {
      backgroundColor: theme.chatListSelected,
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
      color: theme.text,
    },
    chatSubtitle: {
      fontSize: 14,
      color: theme.text,
    },
    chatContent: {
      padding: 0,
      flex: 1,
      backgroundColor: theme.backgroundChat,
    },
    header: {
      backgroundColor: theme.backgroundHeader,
      flexDirection: "row",
      padding: 10,
      alignItems: "center",
    },
    menuButton: {
      marginRight: 10,
    },
    searchButton: {
      marginLeft: "auto",
    },
    moreButton: {
      padding: 5,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    chatHeader: {
      backgroundColor: theme.backgroundChat,
      borderBottomColor: theme.chatDivider,
      borderBottomWidth: 1,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      zIndex: 10,
    },
    chatHeaderTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
      marginLeft: 20,
      flex: 1,
      textAlign: "left",
    },
    backButton: {
      marginRight: 10,
    },
    connectionInfoContainer: {
      backgroundColor: theme.backgroundChatListCheckNetwork,
      padding: 10,
      margin: 10,
      borderRadius: 8,
      color: "white",
    },
    dropdownMenu: {
      position: "absolute",
      top: 50,
      right: 10,
      backgroundColor: "#17212b",
      borderRadius: 8,
      padding: 15,
      zIndex: 20,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      minWidth: 150,
    },
    dropdownItem: {
      color: theme.text,
      marginVertical: 8,
      fontSize: 16,
    },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    leftContainer: {
      flex: 1,
      flexDirection: "column",
    },
    rightContainer: {
      flexDirection: "column",
      alignItems: "flex-end",
    },
    gridText: {
      fontSize: 14,
      color: theme.text,
    },
    chatDate: {
      textAlign: "right",
    },
    staticNumber: {
      textAlign: "right",
    },

    // sidebar

    sidebar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 250,
      backgroundColor: "#405770", // Dark blue/gray color from the image
      zIndex: 2,
      padding: 20,
      borderTopRightRadius: 15,
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    profileContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 30,
    },
    profileTextContainer: {
      flexDirection: "column",
    },
    profileName: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    profilePhone: {
      color: "#ccc",
      fontSize: 14,
    },
    menuContainer: {
      flex: 1,
    },
  });
}
