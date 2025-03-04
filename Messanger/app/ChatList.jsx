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
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Icon from "react-native-vector-icons/MaterialIcons";
import ChatContent from "./ChatContent";
import { ThemeContext } from "@/context/ThemeContext";
import localDatabase from "./utils/localDatabaseMethods";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import WebSocketMethods from "./utils/webSocketMethods";
import eventEmitter from "./utils/EventEmitter";
import NetInfo from "@react-native-community/netinfo";
import { FloatingAction } from "react-native-floating-action";
import AntDesign from "@expo/vector-icons/AntDesign";

const ChatList = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatDetails, setChatDetails] = useState({});
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isMenuVisible, setIsMenuVisible] = useState(false); // Stato per il menu a tendina
  const router = useRouter();
  const params = useLocalSearchParams(); // Per i parametri URL
  const [sidebarPosition] = useState(new Animated.Value(-250));
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [chatContentPosition] = useState(
    new Animated.Value(Dimensions.get("window").width)
  ); // Animazione per il contenuto della chat

  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const actions = [
    {
      text: "Nuova chat",
      icon: <AntDesign name="adduser" size={24} color="white" />,
      name: "bt_accessibility",
      position: 1,
      color: theme.floatingLittleButton,
    },
  ];

  useEffect(() => {
    const checkLogged = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (isLoggedIn === "true") {
        const localUserId = await localDatabase.fetchLocalUserID();
        const apiKey = await localDatabase.fetchLocalUserApiKey();
        setUserId(localUserId);
        if (apiKey) {
          await WebSocketMethods.saveParameters(localUserId, apiKey);
          await WebSocketMethods.openWebSocketConnection();
        }
      } else {
        logout();
      }
    };
    checkLogged();

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
  }, [isSmallScreen, selectedChat]);

  useEffect(() => {
    const updateScreenSize = () => {
      const { width } = Dimensions.get("window");
      setIsSmallScreen(width <= 768);
    };
    Dimensions.addEventListener("change", updateScreenSize);
    updateScreenSize();

    // Gestisci il chatId dall'URL per schermi grandi
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
            text: text,
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
    setSelectedChat(chatId); // Imposta la chat selezionata
    if (!isSmallScreen) {
      router.setParams({ chatId }); // Aggiorna l'URL solo su schermi grandi
    }
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
        <Pressable onPress={toggleSidebar} style={styles.closeButton}>
          <Icon name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.sidebarText}>Menu Item 1</Text>
        <Pressable
          onPress={() => {
            localDatabase.clearDatabase();
            AsyncStorage.setItem("isLoggedIn", "false");
            logout();
          }}
        >
          <Text style={styles.sidebarText}>Logout</Text>
        </Pressable>
      </Animated.View>
    </>
  );

  const renderHeader = () => {
    const selectedDetails = chatDetails[selectedChat] || {};
    const user = selectedDetails.user || {};

    return (
      <View style={styles.header}>
        {isSmallScreen && selectedChat ? (
          <Pressable
            onPress={() => setSelectedChat(null)}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={theme.icon} />
          </Pressable>
        ) : (
          <Pressable onPress={toggleSidebar} style={styles.menuButton}>
            <Icon name="menu" size={24} color={theme.icon} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          Chats
        </Text>
      </View>
    );
  };

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
              <View>
                <Text style={styles.chatTitle}>
                  {item.group_channel_name || user.handle || "Unknown User"}
                </Text>
                <Text style={styles.chatSubtitle}>
                  {lastMessage.text || "No messages yet"}
                </Text>
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
      />
      <Text style={{ fontSize: 12, color: "#426080", textAlign: "center"}}>
        Versione: pre-alpha 0.0.4
      </Text>
    </View>
  );

  const renderChatContent = () => {
    if (!selectedChat) return null;
    const selectedDetails = chatDetails[selectedChat] || {};
    const user = selectedDetails.user || {};
    const chatName = user.handle || "Unknown User";

    return (
      <View style={styles.chatContent}>
        {!isSmallScreen ? (
          <View style={[styles.header, styles.chatHeader]}>
            <Image
              source={{ uri: "https://picsum.photos/200" }}
              style={styles.avatar}
            />
            <Text style={[styles.headerTitle, styles.chatHeaderTitle]}>
              {chatName}
            </Text>
            {/* Icona dei tre puntini */}
            <Pressable
              style={styles.moreButton}
              onPress={() => setIsMenuVisible(!isMenuVisible)}
            >
              <Icon name="more-vert" size={24} color={theme.icon} />
            </Pressable>
            {/* Menu a tendina */}
            {isMenuVisible && (
              <View style={styles.dropdownMenu}>
                <Pressable
                  onPress={() => {
                    console.log("Opzione 1 selezionata");
                    setIsMenuVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItem}>Opzione 1</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    console.log("Opzione 2 selezionata");
                    setIsMenuVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItem}>Opzione 2</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    console.log("Opzione 2 selezionata");
                    setIsMenuVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItem}>Opzione 2</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        <ChatContent
          chatId={selectedChat}
          userId={userId}
          chatName={chatName}
          onBack={() => setSelectedChat(null)} // Passa la funzione per tornare indietro
        />
      </View>
    );
  };

  return (
    <>
      <StatusBar style="light" backgroundColor="#1b2734" translucent={false} />
      {renderSidebar()}
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <View style={styles.container}>
          {isSmallScreen ? (
            <>
              <View style={styles.chatList}>{renderChatList()}</View>
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
                  {renderChatContent()}
                </Animated.View>
              )}
            </>
          ) : (
            <>
              {renderChatList()}
              {renderChatContent()}
            </>
          )}
        </View>
        {!networkAvailable && (
          <Text style={styles.connectionInfoContainer}>
            Network Status: Not Connected
          </Text>
        )}
      </SafeAreaView>
    </>
  );
};

export default ChatList;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: theme.backgroundClassic,
      flex: 1,
    },
    container: {
      flex: 1,
      flexDirection: "row",
    },
    chatList: {
      backgroundColor: theme.backgroundChatList,
      flex: 1,
      padding: 10,
      paddingTop: 0,
    },
    largeScreenChatList: {
      flex: 0.25, //spazio che occupa la colonna delle chat
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
      flex: 1, //spazio che occupa la colonna del contenuto della chat
      padding: 10,
      backgroundColor: theme.backgroundChat,
      zIndex: 0, // Assicuriamo che il contenuto della chat sia sotto l'header
    },
    //Header pagina e chat
    header: {
      backgroundColor: theme.backgroundHeader,
      flexDirection: "row",
      padding: 10,
      alignItems: "center",
    },
    menuButton: {
      marginRight: 10,
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
      backgroundColor: "transparent",
      borderBottomColor: theme.chatDivider,
      borderBottomWidth: 1,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between", // Per allineare avatar, titolo e tre puntini
      zIndex: 10, // Sopra il contenuto della chat
    },
    chatHeaderTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
      marginLeft: 20,
      flex: 1, // Per occupare lo spazio centrale
      textAlign: "left", // Centra il testo
    },
    sidebar: {
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: 250,
      backgroundColor: "#333",
      zIndex: 2,
      padding: 10,
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    },
    sidebarText: {
      color: theme.text,
      marginVertical: 10,
    },
    // closeButton: {
    //   alignSelf: "flex-end",
    // },
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
      top: 50, // Posizionato sotto l'header della chat
      right: 20,
      backgroundColor: "#17212b",
      color: theme.text,
      borderRadius: 8,
      padding: 15,
      zIndex: 11, // Sopra tutto il resto
      elevation: 5, // Ombra per Android
      shadowColor: "#000", // Ombra per iOS
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    dropdownItem: {
      color: theme.text,
      marginVertical: 8,
      fontSize: 16,
    },
  });
}