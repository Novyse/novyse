import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  Animated,
  BackHandler,
  Alert,
  Platform,
} from "react-native";
import moment from "moment";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "@/context/ThemeContext";
import SmartBackground from "./components/SmartBackground";
import NetInfo from "@react-native-community/netinfo";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenLayout from "./components/ScreenLayout";
import methods from "./utils/webrtc/methods";
const { get, check } = methods;

import CreateGroupModal from "./components/CreateGroupModal";
import SidebarItem from "./components/SidebarItem";
import BigFloatingCommsMenu from "./components/comms/BigFloatingCommsMenu";
import SmallCommsMenu from "./components/comms/SmallCommsMenu";

import Search from "./Search";
import APIMethods from "./utils/APImethods";
import eventEmitter from "./utils/EventEmitter";
import WebSocketMethods from "./utils/webSocketMethods";
import localDatabase from "./utils/localDatabaseMethods";
import ChatContainer from "./ChatContainer";

import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Menu02Icon,
  Search02Icon,
  Clock01Icon,
  User03Icon,
  Settings02Icon,
  UserGroup03Icon,
  Logout03Icon,
  ArrowLeft02Icon,
  Message02Icon,
  AudioWave01Icon,
  Layout2ColumnIcon,
} from "@hugeicons/core-free-icons";

const ChatList = () => {
  const [selectedChat, setSelectedChat] = useState(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isToggleSearchChats, setIsToggleSearchChats] = useState(false);
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

  // Force re-render when comms state changes
  const [forceUpdate, setForceUpdate] = useState(0);

  // importo stile e temi colori
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [sidebarPosition] = useState(new Animated.Value(-250));
  const [chatContentPosition] = useState(
    new Animated.Value(Dimensions.get("window").width)
  );

  useEffect(() => {
    // Esponi setContentView globalmente per BigFloatingCommsMenu
    window.setContentView = setContentView;

    return () => {
      delete window.setContentView;
    };
  }, [setContentView]);

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
  // Event-based comms state change detection
  useEffect(() => {
    const handleCommsStateChange = (data) => {
      // Force re-render when someone joins or leaves comms
      if (data.from === get.myPartecipantId()) {
        setForceUpdate((prev) => prev + 1);
      }
    };

    // Listen to comms events
    eventEmitter.on("member_joined_comms", handleCommsStateChange);
    eventEmitter.on("member_left_comms", handleCommsStateChange);

    return () => {
      eventEmitter.off("member_joined_comms", handleCommsStateChange);
      eventEmitter.off("member_left_comms", handleCommsStateChange);
    };
  }, []);

  //logout dall'app sia locale (elimina DB) che remoto (API)
  const logout = async () => {
    await localDatabase.clearDatabase();
    const loggedOutFromAPI = await APIMethods.logoutAPI();
    if (loggedOutFromAPI) {
      console.log("Logout dall'API completato");
    }
    router.navigate("/welcome/emailcheck");
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
      router.setParams({ chatId: chatId, creatingChatWith: undefined });
    } else {
      // Su schermi piccoli, naviga a una nuova schermata
      router.push(`/messages?chatId=${chatId}`);
    }
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

  // Optimized function to determine when to show BigFloatingCommsMenu
  const shouldShowBigFloatingCommsMenu = useCallback(() => {
    if (isSmallScreen) return false;

    const isInComms = check.isInComms();

    if (isInComms) {
      const commsId = get.commsId();

      // If we're in a different chat than the comms chat, always show the menu
      if (selectedChat !== commsId) {
        return true;
      }

      // If we're in the same chat as comms but in "chat" view, show the menu
      if (selectedChat === commsId && contentView === "chat") {
        return true;
      }

      // If we're in the same chat as comms and in "vocal" or "both" view, don't show
      return false;
    } else {
      // Show menu if we're not in a call and no chat is selected
      return false;
    }
  }, [isSmallScreen, selectedChat, contentView, forceUpdate]);

  // Render BigFloatingCommsMenu with consistent props
  const renderBigFloatingCommsMenu = () => {
    if (!shouldShowBigFloatingCommsMenu()) return null;

    return <BigFloatingCommsMenu />;
  };

  // Aggiungi questa funzione accanto a shouldShowBigFloatingCommsMenu
  const shouldShowSmallCommsMenu = useCallback(() => {
    if (!isSmallScreen) return false;

    const isInComms = check.isInComms();

    if (isInComms) {
      const commsId = get.commsId();

      // Se siamo in una chat diversa da quella della chiamata
      if (selectedChat !== commsId) {
        return true;
      }

      // Se siamo nella stessa chat della chiamata ma in vista chat
      if (selectedChat === commsId && contentView === "chat") {
        return true;
      }

      return false;
    } else {
      // Mostra il menu se non siamo in chiamata e non c'è chat selezionata
      return false;
    }
  }, [isSmallScreen, selectedChat, contentView, forceUpdate]);

  // Aggiungi questa funzione accanto a renderBigFloatingCommsMenu
  const renderSmallCommsMenu = () => {
    if (!shouldShowSmallCommsMenu()) return null;

    return <SmallCommsMenu />;
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
        <SmartBackground
          colors={theme?.sideBarGradient}
          style={styles.sidebarContent}
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
              iconName={User03Icon}
              onPress={() => {
                toggleSidebar();
              }}
            />
            <SidebarItem
              text="Settings"
              iconName={Settings02Icon}
              onPress={() => {
                toggleSidebar();
                handleSettingsPress();
              }}
            />
            <SidebarItem
              text="Nuovo Gruppo"
              iconName={UserGroup03Icon}
              onPress={() => {
                toggleSidebar();
                setIsCreateGroupModalVisible(true);
              }}
            />
            <SidebarItem
              text="Logout"
              iconName={Logout03Icon}
              onPress={() => {
                toggleSidebar();
                AsyncStorage.setItem("isLoggedIn", "false");
                logout();
              }}
            />
          </View>
        </SmartBackground>
      </Animated.View>
    </>
  );

  const renderHeader = () => {
    return (
      <SmartBackground
        colors={theme?.backgroundHeaderGradient}
        style={styles.header}
      >
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
      </SmartBackground>
    );
  };

  const renderChatList = () => (
    <SmartBackground
      colors={theme?.backgroundChatListGradient}
      style={[styles.chatListContainer]}
    >
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
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

          const isSelected = selectedChat === item.chat_id;

          return (
            <SmartBackground
              colors={
                isSelected
                  ? theme?.backgroundChatSelectedInsideListGradient
                  : theme?.backgroundChatInsideListGradient
              }
              style={styles.chatItem}
            >
              <Pressable
                style={styles.chatItemPressable}
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
            </SmartBackground>
          );
        }}
      />
    </SmartBackground>
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
      <SmartBackground
        colors={theme?.backgroundHeaderGradient}
        style={[styles.header, styles.chatHeader]}
      >
        {isSmallScreen && (
          <Pressable
            onPress={() => setSelectedChat(null)}
            style={styles.backButton}
          >
            <HugeiconsIcon
              icon={ArrowLeft02Icon}
              size={24}
              color={theme.icon}
              strokeWidth={1.5}
            />
          </Pressable>
        )}
        <Image
          source={{ uri: "https://picsum.photos/200" }}
          style={styles.avatar}
        />
        <Text style={[styles.headerTitle, styles.chatHeaderTitle]}>
          {chatName}
        </Text>

        {/* Mostra i pulsanti solo se chatJoined è true */}
        {chatJoined && (
          <>
            <Pressable
              style={styles.moreButton}
              onPress={() => {
                setContentView("chat");
                setIsMenuVisible(false);
              }}
            >
              <HugeiconsIcon
                icon={Message02Icon}
                size={24}
                color={theme.icon}
                strokeWidth={1.5}
              />
            </Pressable>

            <Pressable
              style={styles.moreButton}
              onPress={() => {
                setContentView("vocal");
                setIsMenuVisible(false);
              }}
            >
              <HugeiconsIcon
                icon={AudioWave01Icon}
                size={24}
                color={theme.icon}
                strokeWidth={1.5}
              />
            </Pressable>

            <Pressable
              style={styles.moreButton}
              onPress={() => {
                setContentView("both");
                setIsMenuVisible(false);
              }}
            >
              {!isSmallScreen ? (
                <HugeiconsIcon
                  icon={Layout2ColumnIcon}
                  size={24}
                  color={theme.icon}
                  strokeWidth={1.5}
                />
              ) : (
                <></>
              )}
            </Pressable>

            {/* Menù 3 puntini, per ora rimosso e sostituito dalle icone */}
            {/* <Pressable
              style={styles.moreButton}
              onPress={() => setIsMenuVisible(!isMenuVisible)}
            >
              <HugeiconsIcon
                icon={MoreVerticalCircle01Icon}
                size={24}
                color={theme.icon}
                strokeWidth={1.5}
              />
            </Pressable> */}
            {!isSmallScreen && (
              <View style={styles.moreButton}>
                {/* Spazio vuoto per sostituire il menù a tre puntini */}
              </View>
            )}
          </>
        )}

        {/* Anche il dropdown menu deve essere condizionale */}
        {isMenuVisible && chatJoined && (
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
      </SmartBackground>
    );

    // In renderChatHeaderAndContent:
    switch (contentView) {
      case "vocal":
      case "chat":
        return (
          <SmartBackground
            colors={theme?.backgroundChatGradient}
            style={styles.chatContent}
            isSmallScreen={isSmallScreen}
          >
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
          </SmartBackground>
        );
      case "both":
        return (
          <SmartBackground
            colors={theme?.backgroundChatGradient}
            style={styles.chatContent}
            isSmallScreen={isSmallScreen}
          >
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
                  contentView="both"
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
          </SmartBackground>
        );
    }
  };

  
  return (
    <ScreenLayout>
      <StatusBar
        style="light"
        backgroundColor={theme.backgroundStatusBar}
        translucent={false}
        hidden={false}
      />
      {renderSidebar()}
      {!isSmallScreen || (isSmallScreen && !selectedChat)
        ? renderHeader()
        : null}
      <View style={styles.container}>
        {isSmallScreen ? (
          <>
            <SmartBackground
              colors={theme?.backgroundChatListGradient}
              style={styles.chatList}
            >
              {renderSmallCommsMenu()}
              {!isToggleSearchChats ? renderChatList() : <Search />}
            </SmartBackground>
            {selectedChat && (
              <View
                style={[
                  styles.chatContent,
                  {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    backgroundColor: theme.backgroundChat, // aggiungi se serve
                  },
                ]}
              >
                {renderChatHeaderAndContent()}
              </View>
            )}
          </>
        ) : (
          <>
            <SmartBackground
              colors={theme?.backgroundChatListGradient}
              style={[styles.chatList, styles.largeScreenChatList]}
            >
              <View style={styles.chatListWrapper}>
                {!isToggleSearchChats ? renderChatList() : <Search />}
                {renderBigFloatingCommsMenu()}
              </View>
            </SmartBackground>
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
    </ScreenLayout>
  );
};

export default ChatList;

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      overflow: "hidden", // Important: Add this to the container
    },
    chatList: {
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
      borderRadius: 13,
      marginBottom: 10,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
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
      // backgroundColor: theme.backgroundChat,
    },
    header: {
      // backgroundColor: theme.backgroundHeader,
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
      marginLeft: 15,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    chatHeader: {
      // backgroundColor: theme.backgroundChat,
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
      color: theme.text,
    },
    dropdownMenu: {
      position: "absolute",
      top: 50,
      right: 10,
      backgroundColor: theme.modalBackground,
      borderRadius: 8,
      padding: 15,
      zIndex: 20,
      elevation: 5,
      shadowColor: theme.shadowColor,
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
      zIndex: 2,
      borderTopRightRadius: 15,
    },
    sidebarContent: {
      flex: 1,
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
      color: theme.text,
      fontSize: 16,
      fontWeight: "bold",
    },
    profilePhone: {
      color: theme.placeholderText,
      fontSize: 14,
    },
    menuContainer: {
      flex: 1,
    },
    chatListContainer: {
      flex: 1,
      position: "relative",
    },
    chatListWrapper: {
      flex: 1,
      position: "relative",
      paddingBottom: 10,
    },
    flatList: {
      flex: 1,
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.icon} transparent`,
        "::-webkit-scrollbar": {
          width: 8,
          backgroundColor: "transparent",
          position: "absolute",
          right: 0,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.icon,
          borderRadius: 4,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
          position: "absolute",
          right: 0,
        },
      }),
    },
    flatListContent: {
      padding: 10,
      paddingTop: 0,
    },
  });
}
