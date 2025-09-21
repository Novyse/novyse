import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  Animated,
  Platform,
} from "react-native";
import moment from "moment";
import { ThemeContext } from "@/context/ThemeContext";
import SmartBackground from "./components/SmartBackground";
import NetInfo from "@react-native-community/netinfo";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import localDatabase from "./utils/localDatabaseMethods";
import Search from "./Search";
import eventEmitter from "./utils/EventEmitter";
import HoverAndPressedButton from "./components/HoverAndPressedButton";
import HeaderBase from "./components/HeaderBase";
import Icon from "./components/Icon";
import SmallCommsMenu from "./components/comms/SmallCommsMenu"; // Solo per small screen
import methods from "./utils/webrtc/methods";
const { get, check } = methods;

// Top-level memoized list item to avoid re-creating component on every render
const ChatListItem = React.memo(
  ({ itemId, chatName, lastMessageText, lastMessageDate, isSelected, onPress, theme, styles }) => {
    return (
      <SmartBackground
        colors={
          isSelected
            ? theme?.backgroundChatSelectedInsideListGradient
            : theme?.backgroundChatInsideListGradient
        }
        style={styles.chatItem}
      >
        <HoverAndPressedButton onPress={() => onPress(itemId)} style={styles.chatItemPressable}>
          <Image source={{ uri: "https://picsum.photos/200" }} style={styles.avatar} />
          <View style={styles.chatItemGrid}>
            <View style={styles.leftContainer}>
              <Text style={[styles.chatTitle, styles.gridText, { marginBottom: 5 }]} numberOfLines={1} ellipsizeMode="tail">
                {chatName}
              </Text>
              <Text style={[styles.chatSubtitle, styles.gridText]} numberOfLines={1} ellipsizeMode="tail">
                {lastMessageText || "No messages yet"}
              </Text>
            </View>
            <View style={styles.rightContainer}>
              <Text style={[styles.chatDate, styles.gridText, { marginBottom: 5 }]} numberOfLines={1} ellipsizeMode="tail">
                {lastMessageDate === "" ? <Icon name={"Clock01Icon"} size={15} /> : lastMessageDate}
              </Text>
              <Text style={[styles.staticNumber, styles.gridText]}>123</Text>
            </View>
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  },
  (prev, next) => {
    // shallow compare important primitive props to avoid re-render
    return (
      prev.isSelected === next.isSelected &&
      prev.chatName === next.chatName &&
      prev.lastMessageDate === next.lastMessageDate &&
      prev.lastMessageText === next.lastMessageText &&
      prev.itemId === next.itemId
    );
  }
);

const ChatList = ({
  selectedChatId,
  onChatSelect,
  chatDetails,
  isToggleSearchChats,
  setIsToggleSearchChats,
  theme,
  colorScheme,
}) => {
  const [chats, setChats] = useState([]);
  // local cache for per-chat details to avoid flicker when parent prop is not yet populated
  const [localDetails, setLocalDetails] = useState({});
  const [userId, setUserId] = useState("");
  const [chatJoined, setChatJoined] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Merge details from parent prop and local cache into a stable map
  const mergedDetails = React.useMemo(() => {
    const m = {};
    if (chats && chats.length > 0) {
      chats.forEach((c) => {
        const external = chatDetails?.[c.chat_id];
        const local = localDetails?.[c.chat_id] || {};
        const hasExternal = external && Object.keys(external).length > 0;
        // If external exists but misses some fields (e.g. user), merge with local to avoid dropping data
        m[c.chat_id] = hasExternal ? { ...local, ...external } : local;
      });
    }
    return m;
  }, [chats, chatDetails, localDetails]);

  // Cache last-known display names to avoid flicker when details temporarily lack user/name
  const nameCacheRef = React.useRef({});

  const router = useRouter();
  const styles = createStyle(theme, colorScheme);

  // Diagnostic: log merged/external/local details when selection changes (helps trace missing names)
  useEffect(() => {
    if (selectedChatId) {
      const external = chatDetails?.[selectedChatId];
      const local = localDetails?.[selectedChatId];
      const merged = mergedDetails[selectedChatId];
      console.log("[ChatList] selectedChatChanged", selectedChatId, { external, local, merged });
    }
  }, [selectedChatId, chatDetails, localDetails, mergedDetails]);

  // useEffect per init fetch (solo locale per lista)
  useEffect(() => {
    const checkLogged = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (isLoggedIn === "true") {
        const localUserId = await localDatabase.fetchLocalUserID();
        setUserId(localUserId);
      }
    };
    checkLogged();

    const updateChatsAndDetails = async () => {
      try {
        const fetchedChats = await fetchChats();
        setChats(fetchedChats);

        // Prefetch missing details (user + lastMessage) for smoother UI
        const missing = fetchedChats.filter((c) => !chatDetails?.[c.chat_id]);
        if (missing.length > 0) {
          const fetchedDetails = {};
          await Promise.all(
            missing.map(async (c) => {
              try {
                let user = await localDatabase.fetchUser(c.chat_id);
                if (user === null || typeof user === "string") {
                  user = { handle: user || "" };
                }
                const lastMessage = await localDatabase.fetchLastMessage(
                  c.chat_id
                );
                fetchedDetails[c.chat_id] = {
                  user,
                  lastMessage,
                  group_channel_name: c.group_channel_name,
                };
              } catch (err) {
                // ignore per-chat errors
              }
            })
          );
          setLocalDetails((prev) => ({ ...prev, ...fetchedDetails }));
        }
      } catch (error) {
        console.error("Error updating chats:", error);
      }
    };

    eventEmitter.on("newChat", updateChatsAndDetails);
    updateChatsAndDetails();

    return () => {
      eventEmitter.off("newChat", updateChatsAndDetails);
    };
  }, []);

  // useEffect per comms events (locale per forceUpdate)
  useEffect(() => {
    const handleCommsStateChange = (data) => {
      if (data.from === get.myPartecipantId()) {
        setForceUpdate((prev) => prev + 1);
      }
    };
    eventEmitter.on("member_joined_comms", handleCommsStateChange);
    eventEmitter.on("member_left_comms", handleCommsStateChange);
    return () => {
      eventEmitter.off("member_joined_comms", handleCommsStateChange);
      eventEmitter.off("member_left_comms", handleCommsStateChange);
    };
  }, []);

  // Funzioni fetch (invariate)
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
    localDatabase.fetchLastMessage(chatId).then((row) => row);

  // handleChatPress semplificato (stable reference)
  const handleChatPress = React.useCallback(
    (chatId) => {
      setChatJoined(true);
      onChatSelect(chatId);
    },
    [onChatSelect]
  );

  // parseTime invariato
  const parseTime = (dateTimeMessage) => {
    if (!dateTimeMessage) return "";
    const timeMoment = moment(dateTimeMessage);
    return timeMoment.isValid() ? timeMoment.format("HH:mm") : "";
  };

  // Helper to derive a display name for a chat; never returns a loading string
  const getDisplayName = (item, details = {}) => {
    // Prefer group name from item (fresh from chats) or details
    if (item?.group_channel_name) return item.group_channel_name;
    if (details.group_channel_name) return details.group_channel_name;

    const user = details.user || {};
    // If user is a primitive (string handle), return that
    if (typeof user === "string") return user || item?.chat_id || "";
    // If we have a name + surname, prefer that
    if (user.name && user.surname) return `${user.name} ${user.surname}`;
    // Fallback to handle or other display fields
    if (user.handle) return user.handle;
    if (user.displayName) return user.displayName;
    // Last resort: show chat id (shortened) so there's always something stable
    if (item?.chat_id) return item.chat_id;
    return "";
  };

  // shouldShowSmallCommsMenu (locale per small screen)
  const shouldShowSmallCommsMenu = () => {
    if (isToggleSearchChats) return false; // Non mostrare se search attiva
    const isInComms = check.isInComms();
    if (isInComms) {
      const commsId = get.commsId();
      if (selectedChatId !== commsId) return true;
      // Assumi "chat" view per default, poiché contentView è in ChatContainer
      return true;
    }
    return false;
  };

  const renderSmallCommsMenu = () =>
    shouldShowSmallCommsMenu() ? <SmallCommsMenu /> : null;

  

  const renderChatList = () => (
    <SmartBackground colors={theme?.backgroundChatListGradient} style={[styles.chatListContainer]}>
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        // extraData ensures items re-render only when selection changes
        extraData={selectedChatId}
        // small performance defaults
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        data={chats}
        keyExtractor={(item) => item.chat_id}
        renderItem={({ item }) => {
          const details = mergedDetails[item.chat_id] || {};
          const isSelected = selectedChatId === item.chat_id;
          let chatName = getDisplayName(item, details);
          // update cache when we have a non-empty name
          if (chatName && chatName.length > 0) {
            nameCacheRef.current[item.chat_id] = chatName;
          } else {
            // fallback to last known name or short chat id
            chatName = nameCacheRef.current[item.chat_id] || (item.chat_id || "").toString().slice(0, 8);
          }
          const lastMessageText = details.lastMessage?.text || "";
          const lastMessageDate = parseTime(details.lastMessage?.date_time);
          return (
            <ChatListItem
              itemId={item.chat_id}
              chatName={chatName}
              lastMessageText={lastMessageText}
              lastMessageDate={lastMessageDate}
              isSelected={isSelected}
              onPress={handleChatPress}
              theme={theme}
              styles={styles}
            />
          );
        }}
      />
    </SmartBackground>
  );
  
  return (
      <View style={styles.chatListWrapper}>
        {renderSmallCommsMenu()}
        {!isToggleSearchChats ? renderChatList() : <Search />}
      </View>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
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
      borderRadius: 13,
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
    searchButton: {
      marginLeft: "auto",
    },
  });
}

export default React.memo(ChatList); // Memo per performance
