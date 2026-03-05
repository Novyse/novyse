import React, {
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import ChatListItem from "@/src/components/chat/list/Item";
import FloatingButton from "@/src/components/FloatingButton";
import CreateChatModal from "@/src/components/modalSheets/createChat";

import useChats from "@/src/hooks/chat/useChats";
import useChatPin from "@/src/hooks/chat/useChatPin";
import useSelection from "@/src/hooks/useSelection";
import { ThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

import { detailsNavigator } from "@/src/utils/navigation/ref";

const ChatList = () => {
  const onChatSelect = (chatUUIDorHandle: String) => {
    setActiveChatUUID(chatUUIDorHandle as string);
    detailsNavigator.navigate("chat", { chatUUIDorHandle });
  };

  const { chatDetails } = useChats();
  const { pinnedChats, pinChats, unpinChats } = useChatPin();

  const { isSmallScreen } = useScreen();
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const styles = createStyle(theme, isSmallScreen, insets);
  const router = useRouter();

  const {
    selectedItems,
    isSelectionMode,
    toggleSelection,
    initiateSelection,
    clearSelection,
  } = useSelection<string>();

  const [orderedChats, setOrderedChats] = useState<any[]>([]);
  const [activeChatUUID, setActiveChatUUID] = useState("");

  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);
  const createChatModalRef = useRef(null);

  useEffect(() => {
    const allChats = Object.values(chatDetails);
    if (allChats.length === 0) {
      setOrderedChats([]);
      return;
    }

    const orderMap = new Map(
      ((pinnedChats as any[]) || []).map((p) => [p.chatUUID, p.position]),
    );
    const sortedChats = ([...allChats] as any[]).sort((a, b) => {
      const pinA = orderMap.has(a.uuid);
      const pinB = orderMap.has(b.uuid);

      if (pinA && pinB) {
        return orderMap.get(a.uuid) - orderMap.get(b.uuid);
      } else if (pinA) {
        return -1;
      } else if (pinB) {
        return 1;
      } else {
        const timeA = a.lastMessage?.created_at
          ? new Date(a.lastMessage.created_at).getTime()
          : 0;
        const timeB = b.lastMessage?.created_at
          ? new Date(b.lastMessage.created_at).getTime()
          : 0;
        return timeB - timeA;
      }
    });

    setOrderedChats(sortedChats);
  }, [chatDetails, pinnedChats]);

  const handleLongPress = (chatUUID) => {
    if (!isSelectionMode) initiateSelection(chatUUID);
  };

  const handlePress = (chatUUID) => {
    if (isSelectionMode) {
      toggleSelection(chatUUID);
    } else {
      onChatSelect(chatUUID);
    }
  };

  const handlePinItems = async () => {
    const chatsToPin = [];
    const chatsToUnpin = [];
    for (const chatUUID of selectedItems) {
      const isPinned = ((pinnedChats as any[]) || []).some(
        (p) => p.chatUUID === chatUUID,
      );
      if (isPinned) {
        chatsToUnpin.push({ chatUUID });
      } else {
        chatsToPin.push({ chatUUID, position: chatsToPin.length });
      }
    }
    await unpinChats(chatsToUnpin);
    await pinChats(chatsToPin);
    clearSelection();
  };

  const renderDefaultHeader = useCallback(
    () => (
      <BlurredHeader
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: "#2951a9",
        }}
      >
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
      <BlurredHeader
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: "#2951a9",
        }}
      >
        <Icon name={"Cancel01Icon"} size={24} onPress={clearSelection} />
        <Text style={styles.headerTitle}>{selectedItems.length} selected</Text>
        <Icon name={"PinIcon"} size={24} onPress={handlePinItems} />
      </BlurredHeader>
    ),
    [selectedItems.length, styles.headerTitle, clearSelection, handlePinItems],
  );

  const renderItem = ({ item }) => {
    const isPinned = ((pinnedChats as any[]) || []).some(
      (p) => p.chatUUID === item.uuid,
    );
    return (
      <ChatListItem
        item={item}
        isSelected={selectedItems.includes(item.uuid)}
        isActive={item.uuid === activeChatUUID && !isSmallScreen}
        isPinned={isPinned}
        unreadCount={item.unreadCount}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    );
  };

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
        onPress={() => {
          if (Platform.OS !== "web") {
            createChatModalRef.current?.present();
          } else {
            setIsCreateChatModalVisible(true);
          }
        }}
        iconName="ChatAddIcon"
        size={isSmallScreen ? 16 : 24}
        width={isSmallScreen ? 45 : 60}
        height={isSmallScreen ? 45 : 60}
        position={{ bottom: isSmallScreen ? 100 : 25, right: 20 }}
      />

      <CreateChatModal
        ref={createChatModalRef}
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

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
      paddingTop: 75 + insets.top,
    },
    flatListContent: {
      padding: 10,
      gap: 10,
      paddingBottom: (isSmallScreen ? 180 : 90) + insets.bottom,
    },
    logo: { width: 24, height: 24 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: "bold" },
  });
}

export default React.memo(ChatList);
