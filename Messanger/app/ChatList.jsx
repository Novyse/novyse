import React, { useState, useEffect, useContext, useRef } from "react";
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
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Icon from "react-native-vector-icons/MaterialIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import ChatContent from "./ChatContent";
import VocalContent from "./VocalContent";
import { ThemeContext } from "@/context/ThemeContext";
import localDatabase from "./utils/localDatabaseMethods";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import eventEmitter from "./utils/EventEmitter";
import NetInfo from "@react-native-community/netinfo";
import { FloatingAction } from "react-native-floating-action";
import AntDesign from "@expo/vector-icons/AntDesign";
import appJson from "../app.json";
import moment from "moment";
import { SafeAreaProvider } from "react-native-safe-area-context";
import WebSocketMethods from "./utils/webSocketMethods";
import Search from "./Search";

const ChatList = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isToggleSearchChats, setIsToggleSearchChats] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const [chats, setChats] = useState([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [chatDetails, setChatDetails] = useState({});
  const [contentView, setContentView] = useState("chat");

  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [sidebarPosition] = useState(new Animated.Value(-250));
  const [chatContentPosition] = useState(
    new Animated.Value(Dimensions.get("window").width)
  );

  const actions = [
    {
      text: "Nuova chat",
      icon: <AntDesign name="adduser" size={24} color="white" />,
      name: "bt_new_chat",
      position: 1,
      color: theme.floatingLittleButton,
    },
    {
      text: "Nuovo gruppo",
      icon: <AntDesign name="addusergroup" size={24} color="white" />,
      name: "bt_new_group",
      position: 2,
      color: theme.floatingLittleButton,
    },
  ];

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

    const checkConnection = NetInfo.addEventListener((state) => {
      setNetworkAvailable(state.isConnected);
    });

    WebSocketMethods.openWebSocketConnection();

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
  }, [isSmallScreen, selectedChat]);

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
    const handleNewMessageSent = (data) => {
      const { chat_id, text, date } = data;
      setChatDetails((current) => ({
        ...current,
        [chat_id]: {
          ...current[chat_id],
          lastMessage: {
            ...current[chat_id]?.lastMessage,
            text: text !== null ? text : current[chat_id]?.lastMessage?.text, // Mantieni il vecchio text se il nuovo è null
            date_time: date,
          },
        },
      }));
    };

    eventEmitter.on("updateNewLastMessage", handleNewMessageSent);

    return () => {
      eventEmitter.off("updateNewLastMessage", handleNewMessageSent);
    };
  }, []);

  useEffect(() => {
    if (isSmallScreen) {
      Animated.timing(chatContentPosition, {
        toValue: selectedChat ? 0 : Dimensions.get("window").width,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedChat, isSmallScreen]);

  const logout = () => {
    router.navigate("/loginSignup/EmailCheckForm");
  };

  const fetchLocalUserNameAndSurname = () => Promise.resolve("John Doe");

  const fetchChats = () =>
    localDatabase.fetchChats().then((chats) =>
      chats.map((chat) => ({
        chat_id: chat.chat_id,
        group_channel_name: chat.group_channel_name || "",
      }))
    );

  const fetchUser = (chatId) =>
    localDatabase.fetchUser(chatId).then((handle) => ({ handle }));

  const fetchLastMessage = (chatId) =>
    localDatabase.fetchLastMessage(chatId).then((row) => ({
      text: row.text,
      date_time: row.date_time,
    }));

  useEffect(() => {
    // Create a function to fetch and update chat data
    const updateChatsAndDetails = async () => {
      try {
        const fetchedChats = await fetchChats();
        const details = {};

        for (const chat of fetchedChats) {
          const user = await fetchUser(chat.chat_id);
          const lastMessage = await fetchLastMessage(chat.chat_id);
          details[chat.chat_id] = { user, lastMessage };
        }

        setChats(fetchedChats);
        setChatDetails(details);
        console.log("Chats updated:", fetchedChats);
        console.log("Chat Details updated:", details);
      } catch (error) {
        console.error("Error updating chats:", error);
      }
    };

    // Initial fetch
    updateChatsAndDetails();

    // Listen for new chat events
    eventEmitter.on("newChat", updateChatsAndDetails);

    // Cleanup
    return () => {
      eventEmitter.off("newChat", updateChatsAndDetails);
    };
  }, []);

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

  const handleChatPress = (chatId) => {
    setSelectedChat(chatId);
    if (!isSmallScreen) {
      router.setParams({ chatId });
    }
  };

  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  //Setting Menu
  const handleSettingsPress = () => {
    router.navigate("/settings/SettingsMenu");
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
        {/* User Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.avatar} />
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>Nome Cognome</Text>
            <Text style={styles.profilePhone}>+39 1234567890</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {/* Menu Item 1: Profile */}
          <Pressable style={styles.menuItem}>
            <AntDesign
              name="user"
              size={24}
              color="white"
              style={styles.menuIcon}
            />
            <Text style={styles.sidebarText}>Profile</Text>
          </Pressable>

          {/* Menu Item 2: Settings */}
          <Pressable style={styles.menuItem} onPress={handleSettingsPress}>
            <MaterialIcons
              name="settings"
              size={24}
              color="white"
              style={styles.menuIcon}
            />
            <Text style={styles.sidebarText}>Settings</Text>
          </Pressable>

          {/* Logout Button */}
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              localDatabase.clearDatabase();
              AsyncStorage.setItem("isLoggedIn", "false");
              logout();
            }}
          >
            <MaterialIcons
              name="logout"
              size={24}
              color="white"
              style={styles.menuIcon}
            />
            <Text style={styles.sidebarText}>Logout qua temp</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <Pressable onPress={toggleSidebar} style={styles.menuButton}>
          <Icon name="menu" size={24} color={theme.icon} />
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
          <MaterialIcons name="search" size={24} color={theme.icon} />
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
          const details = chatDetails[item.chat_id] || {};
          const user = details.user || {};
          const lastMessage = details.lastMessage || {};
          const lastMessageDate = parseTime(lastMessage.date_time);

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
                    {item.group_channel_name || user.handle || "Unknown User"}
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
                      <MaterialIcons
                        name="access-time"
                        size={14}
                        color="#ffffff"
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
      <FloatingAction
        actions={actions}
        onPressItem={(name) => console.log(`selected button: ${name}`)}
        color={theme.floatingBigButton}
        overlayColor="rgba(0, 0, 0, 0)"
        shadow={{ shadowColor: "transparent" }}
        distanceToEdge={10}
      />
      <Text style={{ fontSize: 12, color: "#426080", textAlign: "center" }}>
        Versione: {appJson.expo.version}
      </Text>
    </View>
  );

  const renderChatHeaderAndContent = () => {
    if (!selectedChat) return null;
    const selectedDetails = chatDetails[selectedChat] || {};
    const user = selectedDetails.user || {};
    const chatName = user.handle || "Unknown User";

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

    switch (contentView) {
      case "vocal":
        return (
          <View style={styles.chatContent}>
            {renderChatHeader}
            <VocalContent chatId={selectedChat} userId={userId} />
          </View>
        );
      case "chat":
        return (
          <View style={styles.chatContent}>
            {renderChatHeader}
            <ChatContent
              chatId={selectedChat}
              userId={userId}
              chatName={chatName}
              onBack={() => setSelectedChat(null)}
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
                <ChatContent
                  chatId={selectedChat}
                  userId={userId}
                  chatName={chatName}
                  onBack={() => setSelectedChat(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <VocalContent chatId={selectedChat} userId={userId} />
              </View>
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.chatContent}>
            {renderChatHeader}
            <ChatContent
              chatId={selectedChat}
              userId={userId}
              chatName={chatName}
              onBack={() => setSelectedChat(null)}
            />
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
                <Search style={styles.chatList}/>
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
      flex: 1,
    },
    largeScreenChatList: {
      flex: 0.25,
      borderRightWidth: 1,
      borderRightColor: theme.chatDivider,
    },
    chatItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: "#2b3e51",
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
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: "#ccc", // Placeholder for the avatar (gray circle)
      marginRight: 15,
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
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)", // Subtle divider
    },
    menuIcon: {
      marginRight: 15,
    },
    sidebarText: {
      color: "#fff",
      fontSize: 16,
    },
  });
}
