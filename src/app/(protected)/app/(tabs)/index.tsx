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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import Avatar from "@/src/components/Avatar";
import ChatListItem from "@/src/components/chat/List/Item";
import FloatingButton from "@/src/components/FloatingButton";
import CreateChatModal from "@/src/components/modals/createChat";

import useChats from "@/src/hooks/chat/useChats";
import { LocalUserContext } from "@/context/LocalUserContext";
import BlurredView from "@/src/components/BlurredView";
import { ThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

import { detailsNavigator } from "@/src/utils/navigation/ref";

const PINNED_CHATS_STORAGE_KEY = "@chat_order";

const ChatList = () => {
  const onChatSelect = (chatUUIDorHandle: String) => {
    setActiveChatUUID(chatUUIDorHandle as string);
    detailsNavigator.navigate("chat", { chatUUIDorHandle });
  };

  const { chatDetails } = useChats();

  const { isSmallScreen } = useScreen();
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const styles = createStyle(theme, isSmallScreen, insets);
  const router = useRouter();

  const [selectedItems, setSelectedItems] = useState([]);
  const [orderedChats, setOrderedChats] = useState([]);
  const [activeChatUUID, setActiveChatUUID] = useState("");
  const isSelectionMode = selectedItems.length > 0;

  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);

  useEffect(() => {
    const organizeChats = async () => {
      const allChats = Object.values(chatDetails);
      if (allChats.length === 0) {
        setOrderedChats([]);
        return;
      }
      try {
        const savedOrderJSON = await AsyncStorage.getItem(
          PINNED_CHATS_STORAGE_KEY,
        );
        const savedOrderIds = savedOrderJSON ? JSON.parse(savedOrderJSON) : [];
        const orderMap = new Map(savedOrderIds.map((id, index) => [id, index]));
        const sortedChats = [...allChats].sort((a, b) => {
          const indexA = orderMap.get(a.uuid) ?? Infinity;
          const indexB = orderMap.get(b.uuid) ?? Infinity;
          return indexA - indexB;
        });
        setOrderedChats(sortedChats);
      } catch (e) {
        setOrderedChats(allChats);
      }
    };
    organizeChats();
  }, [chatDetails]);

  const handleLongPress = (chatUUID) => {
    if (!isSelectionMode) setSelectedItems([chatUUID]);
  };

  const handlePress = (chatUUID) => {
    if (isSelectionMode) {
      setSelectedItems((current) =>
        current.includes(chatUUID)
          ? current.filter((id) => id !== chatUUID)
          : [...current, chatUUID],
      );
    } else {
      onChatSelect(chatUUID);
    }
  };

  const handlePinItems = async () => {
    const selectedChats = orderedChats.filter((chat) =>
      selectedItems.includes(chat.uuid),
    );
    const unselectedChats = orderedChats.filter(
      (chat) => !selectedItems.includes(chat.uuid),
    );
    const newOrderedList = [...selectedChats, ...unselectedChats];
    setOrderedChats(newOrderedList);
    try {
      await AsyncStorage.setItem(
        PINNED_CHATS_STORAGE_KEY,
        JSON.stringify(newOrderedList.map((chat) => chat.uuid)),
      );
    } catch (e) {}
    setSelectedItems([]);
  };

  const renderDefaultHeader = useCallback(
    () => (
      <BlurredHeader style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
        />
        <Icon
          name={"Search02Icon"}
          size={24}
          onPress={() => router.push("/app/search")}
        />
      </BlurredHeader>
    ),
    [styles.logo, router],
  );

  const renderSelectionHeader = useCallback(
    () => (
      <BlurredHeader style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
        <Icon
          name={"Cancel01Icon"}
          size={24}
          onPress={() => setSelectedItems([])}
        />
        <Text style={styles.headerTitle}>{selectedItems.length} selected</Text>
        <Icon name={"PinIcon"} size={24} onPress={handlePinItems} />
      </BlurredHeader>
    ),
    [selectedItems.length, styles.headerTitle],
  );

  const renderItem = ({ item }) => (
    <ChatListItem
      item={item}
      isSelected={selectedItems.includes(item.uuid)}
      isActive={item.uuid === activeChatUUID}
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
          <FlatList
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            data={orderedChats}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            extraData={selectedItems}
          />
        </BlurredView>
      ) : (
        <View style={styles.chatListWrapper}>
          {isSelectionMode ? renderSelectionHeader() : renderDefaultHeader()}
          <FlatList
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            data={orderedChats}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            extraData={selectedItems}
          />
        </View>
      )}
      <FloatingButton
        onPress={() => setIsCreateChatModalVisible(true)}
        iconName="ChatAddIcon"
        size={isSmallScreen ? 16 : 24}
        width={isSmallScreen ? 45 : 60}
        height={isSmallScreen ? 45 : 60}
        position={{ bottom: isSmallScreen ? 100 : 25, right: 20 }}
      />

      <CreateChatModal
        visible={isCreateChatModalVisible}
        onClose={() => setIsCreateChatModalVisible(false)}
      />
    </SmartBackground>
  );
};

function createStyle(theme, isSmallScreen, insets) {
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
      overflow: "hidden",
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
      paddingTop: 75 + insets.top,
    },
    flatListContent: { padding: 10, gap: 10 },
    chatItem: { borderRadius: 15, height: 65 },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 15,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    logo: { width: 24, height: 24 },
    chatTitle: { fontSize: 16, fontWeight: "bold", color: theme.text },
    chatSubtitle: { fontSize: 14, color: theme.text },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    leftContainer: { flex: 1, flexDirection: "column" },
    rightContainer: { flexDirection: "column", alignItems: "flex-end" },
    gridText: { fontSize: 14, color: theme.text },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: "bold" },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    ballText: { textAlign: "center", color: theme.text, fontSize: 12 },
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
