import React, { useState, useContext, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DateTime } from "luxon";

import SmartBackground from "../components/SmartBackground";
import Search from "./Search";
import HoverAndPressedButton from "../components/HoverAndPressedButton";
import Icon from "../components/Icon";
import HeaderBase from "../components/HeaderBase";
import useChats from "../hooks/chat/useChats";
import useAppInit from "../hooks/auth/useAppInit";
import { ChatContext } from "@/context/ChatContext";
import { UserContext } from "@/context/UserContext";
import BlurredView from "../components/BlurredView";

const PINNED_CHATS_STORAGE_KEY = "@chat_order"; // Rinominato per chiarezza

const ChatListItem = React.memo(
  ({ item, isSelected, onPress, onLongPress, theme, styles }) => {
    const { userUUID } = useContext(UserContext);

    const parseTime = (dateTimeMessage) => {
      if (!dateTimeMessage) return "";
      return DateTime.fromJSDate(new Date(dateTimeMessage)).toFormat("HH:mm");
    };

    const displayMessage = (message) => {
      if (!message) return null;
      let content = message.content;

      let sender = "";
      if (message.senderUUID === userUUID) {
        sender = "You: ";
      } else if (message.senderUUID && message.sender_name) {
        sender = `${message.sender_name}: `;
      } else if (message.type === "system") {
        sender = "";
      } else {
        sender = "Unknown: ";
      }

      return (
        <Text
          style={[styles.chatSubtitle, styles.gridText]}
          numberOfLines={1}
          ellipsizeMode="tail"
          selectable={false}
        >
          {sender}
          {content}
        </Text>
      );
    };

    return (
      <SmartBackground
        colors={
          isSelected
            ? theme?.backgroundChatListItemSelectedGradient
            : theme?.backgroundChatListItemGradient
        }
        style={styles.chatItem}
      >
        <HoverAndPressedButton
          onPress={() => onPress(item.uuid)}
          onLongPress={() => onLongPress(item.uuid)}
          style={styles.chatItemPressable}
        >
          {isSelected && (
            <View style={styles.selectionIndicator}>
              <Icon name={"Tick02Icon"} size={24} />
            </View>
          )}
          <Image
            source={{ uri: "https://picsum.photos/200" }}
            style={styles.avatar}
          />
          <View style={styles.chatItemGrid}>
            <View style={styles.leftContainer}>
              <Text
                style={[styles.chatTitle, styles.gridText, { marginBottom: 5 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                selectable={false}
              >
                {item.name}
              </Text>
              {displayMessage(item.lastMessage)}
            </View>
            <View style={styles.rightContainer}>
              <View style={styles.dateContainer}>
                {!item.lastMessage?.created_at ? (
                  <Icon name={"Clock01Icon"} size={14} />
                ) : (
                  <>
                    <Icon name={"TickDouble02Icon"} size={18} />
                    <Text style={styles.chatDateText} selectable={false}>
                      {parseTime(item.lastMessage?.created_at)}
                    </Text>
                  </>
                )}
              </View>
              <View style={[styles.ball]}>
                <Text style={[styles.ballText]} selectable={false}>
                  17
                </Text>
              </View>
            </View>
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  }
);

const ChatList = ({
  onChatSelect,
  isToggleSearchChats,
  setIsToggleSearchChats,
  theme,
  colorScheme,
  toggleSidebar,
}) => {
  useAppInit(true);
  const { chatDetails } = useChats();
  const { width } = useWindowDimensions();
  const [isSmallScreen, setIsSmallScreen] = useState(width < 768);
  const styles = createStyle(theme, isSmallScreen);

  const [selectedItems, setSelectedItems] = useState([]);
  const [orderedChats, setOrderedChats] = useState([]);

  const isSelectionMode = selectedItems.length > 0;

  // Aggiorna isSmallScreen quando le dimensioni cambiano
  useEffect(() => {
    setIsSmallScreen(width < 768);
  }, [width]);

  // LOGICA SEMPLIFICATA IN UN UNICO useEffect
  useEffect(() => {
    const organizeChats = async () => {
      const allChats = Object.values(chatDetails);
      if (allChats.length === 0) {
        setOrderedChats([]);
        return;
      }

      try {
        const savedOrderJSON = await AsyncStorage.getItem(
          PINNED_CHATS_STORAGE_KEY
        );
        const savedOrderIds = savedOrderJSON ? JSON.parse(savedOrderJSON) : [];

        // Crea una mappa per un lookup veloce della posizione di ogni chat
        const orderMap = new Map(savedOrderIds.map((id, index) => [id, index]));

        const sortedChats = [...allChats].sort((a, b) => {
          const indexA = orderMap.get(a.uuid) ?? Infinity;
          const indexB = orderMap.get(b.uuid) ?? Infinity;
          return indexA - indexB;
        });

        setOrderedChats(sortedChats);
      } catch (e) {
        console.error("Failed to organize chats:", e);
        setOrderedChats(allChats); // In caso di errore, mostra le chat in ordine di default
      }
    };

    organizeChats();
  }, [chatDetails]); // Si attiva solo quando le chat iniziali cambiano

  const handleLongPress = (chatUUID) => {
    if (!isSelectionMode) {
      setSelectedItems([chatUUID]);
    }
  };

  const handlePress = (chatUUID) => {
    if (isSelectionMode) {
      setSelectedItems((currentSelected) =>
        currentSelected.includes(chatUUID)
          ? currentSelected.filter((id) => id !== chatUUID)
          : [...currentSelected, chatUUID]
      );
    } else {
      onChatSelect(chatUUID);
    }
  };

  const handleCancelSelection = () => {
    setSelectedItems([]);
  };

  const handlePinItems = async () => {
    // Sposta le chat selezionate all'inizio della lista
    const selectedChats = orderedChats.filter((chat) =>
      selectedItems.includes(chat.uuid)
    );
    const unselectedChats = orderedChats.filter(
      (chat) => !selectedItems.includes(chat.uuid)
    );
    const newOrderedList = [...selectedChats, ...unselectedChats];

    // 1. Aggiorna subito la UI
    setOrderedChats(newOrderedList);

    // 2. Salva il nuovo ordine (solo gli ID) su disco
    try {
      const newOrderedIds = newOrderedList.map((chat) => chat.uuid);
      await AsyncStorage.setItem(
        PINNED_CHATS_STORAGE_KEY,
        JSON.stringify(newOrderedIds)
      );
    } catch (e) {
      console.error("Failed to save chat order:", e);
    }

    // 3. Esci dalla modalità selezione
    setSelectedItems([]);
  };

  const renderDefaultHeader = useCallback(
    () => (
      <HeaderBase>
        <Icon name={"Menu02Icon"} size={32} onPress={toggleSidebar} />
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
        />
        <Icon
          name={"Search02Icon"}
          size={32}
          onPress={() => setIsToggleSearchChats((p) => !p)}
        />
      </HeaderBase>
    ),
    [toggleSidebar, setIsToggleSearchChats, styles.logo]
  );

  const renderSelectionHeader = useCallback(
    () => (
      <HeaderBase>
        <Icon name={"Cancel01Icon"} size={32} onPress={handleCancelSelection} />
        <Text style={styles.headerTitle}>
          {selectedItems.length} selezionate
        </Text>
        <Icon name={"PinIcon"} size={32} onPress={handlePinItems} />
      </HeaderBase>
    ),
    [selectedItems.length, styles.headerTitle]
  );

  const renderItem = ({ item }) => (
    <ChatListItem
      item={item}
      isSelected={selectedItems.includes(item.uuid)}
      onPress={handlePress}
      onLongPress={handleLongPress}
      theme={theme}
      styles={styles}
    />
  );

  return (
    <SmartBackground
      colors={theme?.backgroundChatListGradient}
      style={styles.chatListContainer}
    >
      {!isSmallScreen ? (
        <BlurredView style={styles.chatListWrapper}>
          {isSelectionMode ? renderSelectionHeader() : renderDefaultHeader()}
          {!isToggleSearchChats ? (
            <FlatList
              style={styles.flatList}
              contentContainerStyle={styles.flatListContent}
              data={orderedChats}
              keyExtractor={(item) => item.uuid}
              renderItem={renderItem}
              extraData={selectedItems}
            />
          ) : (
            <Search />
          )}
        </BlurredView>
      ) : (
        <View style={styles.chatListWrapper}>
          {isSelectionMode ? renderSelectionHeader() : renderDefaultHeader()}
          {!isToggleSearchChats ? (
            <FlatList
              style={styles.flatList}
              contentContainerStyle={styles.flatListContent}
              data={orderedChats}
              keyExtractor={(item) => item.uuid}
              renderItem={renderItem}
              extraData={selectedItems}
            />
          ) : (
            <Search />
          )}
        </View>
      )}
    </SmartBackground>
  );
};

function createStyle(theme, isSmallScreen) {
  return StyleSheet.create({
    chatListContainer: {
      flex: 1,
      position: "relative",
      padding: isSmallScreen ? 0 : 10,
    },
    chatListWrapper: {
      flex: 1,
      position: "relative",
      borderRadius: isSmallScreen ? 0 : 15,
    },
    flatList: {
      flex: 1,
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    flatListContent: {
      padding: 10,
      gap: 10,
    },
    chatItem: {
      borderRadius: 15,
      height: 65,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 15,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    logo: {
      width: 24,
      height: 24,
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
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    ballText: {
      textAlign: "center",
      color: theme.text,
      fontSize: 12,
    },
    dateContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 5,
    },
    chatDateText: {
      fontSize: 14,
      color: theme.text,
      textAlign: "right",
      marginLeft: 5,
    },
    selectionIndicator: {
      position: "absolute",
      top: 5,
      left: 5,
      zIndex: 1,
      backgroundColor: "#25b34bff",
      borderRadius: 999,
    },
  });
}

export default React.memo(ChatList);
