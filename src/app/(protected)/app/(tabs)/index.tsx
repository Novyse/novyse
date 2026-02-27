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

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import Avatar from "@/src/components/Avatar";
import ChatListItem from "@/src/components/chat/list/Item";
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
    } catch (e) { }
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
      isActive={item.uuid === activeChatUUID && !isSmallScreen}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  );

  return (
    <>
      {isSelectionMode ? renderSelectionHeader() : renderDefaultHeader()}
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        data={orderedChats}
        keyExtractor={(item) => item.uuid}
        renderItem={renderItem}
        extraData={selectedItems}
      />

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
    </>
  );
};

function createStyle(theme, isSmallScreen, insets) {
  return StyleSheet.create({
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
    logo: { width: 24, height: 24 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: "bold" },
  });
}

export default React.memo(ChatList);
