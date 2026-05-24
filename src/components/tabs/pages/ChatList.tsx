import React, {
  useState,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { StyleSheet, Image, Platform, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import AppText from "@/src/components/AppText";
import { useShareIntentContext } from "expo-share-intent";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";

import { Chat } from "@/src/types/chat";

import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import ChatListItem from "@/src/components/chat/list/Item";
import FloatingButton from "@/src/components/FloatingButton";
import CreateChatModal from "@/src/components/modalSheets/createChat";
import CommsHeader from "@/src/components/chat/content/header/CommsHeader";

import useChatStore from "@/src/context/ChatContext";
import useChatPin from "@/src/hooks/chat/useChatPin";
import useSelection from "@/src/hooks/useSelection";
import { useForward } from "@/src/hooks/chat/useForward";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import { useCommsContext } from "@/src/context/CommsContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";
import useWindowSizeStore from "@/src/context/WindowSizeContext";

import { tabNavigator } from "@/src/utils/navigation/tabRef";
import { ScrollBar } from "@/constants/ScrollBar";

const ChatList = () => {
  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const setSelectedChatUUID = useActiveChatStore(
    (state) => state.setSelectedChatUUID,
  );

  const onChatSelect = (chatUUIDorHandle: String) => {
    setSelectedChatUUID(chatUUIDorHandle as string);
  };

  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();

  const { isForwarding, completeForwarding, resetForwarding } = useForward();

  const onChatSelectWithIntent = useCallback(
    (chatUUID: string) => {
      if (hasShareIntent) {
        const { chatUIStates } = useActiveChatStore.getState();

        const updateData: any = {};
        if (shareIntent.text) {
          updateData.newMessageText = shareIntent.text;
        } else if (shareIntent.files && shareIntent.files.length > 0) {
          updateData.files = shareIntent.files.map((file) => ({
            uri: file.path,
            name: file.fileName || "file",
            type: file.mimeType || "*/*",
            size: file.size || 0,
          }));
        }

        useActiveChatStore.setState({
          chatUIStates: {
            ...chatUIStates,
            [chatUUID]: {
              ...(chatUIStates[chatUUID] || {
                contentView: "chat",
                newMessageText: "",
                files: [],
                invalidFiles: [],
                editingMessage: null,
                selectedMessages: [],
                replyingTo: [],
              }),
              ...updateData,
            },
          },
        });

        // resetShareIntent();
      }
      onChatSelect(chatUUID);
    },
    [hasShareIntent, shareIntent, resetShareIntent, onChatSelect],
  );

  const chats = useChatStore((state) => state.chats);
  const { pinnedChats, pinChats, unpinChats } = useChatPin();

  const { isSmallScreen } = useScreen();
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const { connected, room, participants } = useCommsContext();
  const isFocused = useIsFocused();
  const { isSidebarCollapsed } = useWindowSizeStore();
  const showCollapsedSidebar =
    isSidebarCollapsed && !isSmallScreen && isFocused;
  const hasComms = connected && isSmallScreen;

  const styles = createStyle(theme, isSmallScreen, insets, hasComms);

  const {
    selectedItems,
    isSelectionMode,
    toggleSelection,
    initiateSelection,
    clearSelection,
  } = useSelection<string>();

  const [orderedChats, setOrderedChats] = useState<any[]>([]);

  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);
  const createChatModalRef = useRef(null);

  useEffect(() => {
    if (chats.length === 0) {
      setOrderedChats([]);
      return;
    }

    const orderMap = new Map(
      ((pinnedChats as any[]) || []).map((p) => [p.chatUUID, p.position]),
    );
    const sortedChats = ([...chats] as any[]).sort((a, b) => {
      const pinA = orderMap.has(a.uuid);
      const pinB = orderMap.has(b.uuid);

      if (pinA && pinB) {
        return orderMap.get(a.uuid) - orderMap.get(b.uuid);
      } else if (pinA) {
        return -1;
      } else if (pinB) {
        return 1;
      } else {
        const lastMsgA =
          a.messages && a.messages.length > 0
            ? a.messages[a.messages.length - 1]
            : null;
        const lastMsgB =
          b.messages && b.messages.length > 0
            ? b.messages[b.messages.length - 1]
            : null;

        const timeA = lastMsgA
          ? lastMsgA.created_at
            ? new Date(lastMsgA.created_at).getTime()
            : Date.now()
          : 0;
        const timeB = lastMsgB
          ? lastMsgB.created_at
            ? new Date(lastMsgB.created_at).getTime()
            : Date.now()
          : 0;
        return timeB - timeA;
      }
    });

    setOrderedChats(sortedChats);
  }, [chats, pinnedChats]);

  const handleLongPress = (chatUUID: string) => {
    if (!isSelectionMode) initiateSelection(chatUUID);
  };

  const handlePress = (chatUUID: string) => {
    if (isSelectionMode) {
      toggleSelection(chatUUID);
    } else if (isForwarding) {
      completeForwarding(chatUUID);
    } else {
      if (hasShareIntent) {
        onChatSelectWithIntent(chatUUID);
      } else {
        onChatSelect(chatUUID);
      }
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

  const commsHeaderComponent = hasComms ? (
    <CommsHeader
      connected={connected}
      roomName={room?.roomInfo.name}
      participantsCount={participants.length}
    />
  ) : null;

  const renderDefaultHeader = useCallback(
    () => (
      <BlurredHeader
        style={[
          {
            paddingHorizontal: 10,
            paddingVertical: 5,
            justifyContent: "space-between",
            alignItems: "center",
          },
          showCollapsedSidebar && {
            width: 50,
            height: 50,
            borderRadius: 25,
            paddingHorizontal: 0,
            justifyContent: "center",
            overflow: "hidden",
          },
        ]}
        commsHeader={commsHeaderComponent}
      >
        <Image
          source={require("@/assets/images/logo-novyse.png")}
          style={styles.logo}
        />
        {!showCollapsedSidebar && (
          <Icon
            name={"Search02Icon"}
            onPress={() => tabNavigator.navigate("Search")}
          />
        )}
      </BlurredHeader>
    ),
    [styles.logo, commsHeaderComponent, showCollapsedSidebar],
  );

  const renderSelectionHeader = useCallback(
    () => (
      <BlurredHeader
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: theme.backgroundMain,
        }}
        commsHeader={commsHeaderComponent}
      >
        <Icon name={"Cancel01Icon"} onPress={clearSelection} />
        <AppText
          style={styles.headerTitle}
          translationKey="tabs.chatList.selected"
          translationOptions={{ count: selectedItems.length }}
        />
        <Icon name={"PinIcon"} onPress={handlePinItems} />
      </BlurredHeader>
    ),
    [
      selectedItems.length,
      styles.headerTitle,
      clearSelection,
      handlePinItems,
      commsHeaderComponent,
    ],
  );

  const renderIntentHeader = useCallback(
    () => (
      <BlurredHeader
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: theme.backgroundMain,
          flexDirection: "row",
          alignItems: "center",
        }}
        commsHeader={commsHeaderComponent}
      >
        <View style={{ width: 40, alignItems: "flex-start" }}>
          <Icon name={"Cancel01Icon"} onPress={() => resetShareIntent()} />
        </View>
        <AppText
          style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}
          translationKey="tabs.chatList.intentSharing"
        />
        <View style={{ width: 40 }} />
      </BlurredHeader>
    ),
    [styles.headerTitle, resetShareIntent, commsHeaderComponent],
  );

  const renderForwardingHeader = useCallback(
    () => (
      <BlurredHeader
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: theme.backgroundMain,
          flexDirection: "row",
          alignItems: "center",
        }}
        commsHeader={commsHeaderComponent}
      >
        <View style={{ width: 40, alignItems: "flex-start" }}>
          <Icon name={"Cancel01Icon"} onPress={() => resetForwarding()} />
        </View>
        <AppText
          style={[styles.headerTitle, { flex: 1, textAlign: "center" }]}
          translationKey="tabs.chatList.forwarding"
        />
        <View style={{ width: 40 }} />
      </BlurredHeader>
    ),
    [styles.headerTitle, resetForwarding, commsHeaderComponent],
  );

  const renderItem = ({ item }: { item: Chat }) => {
    const isPinned = ((pinnedChats as any[]) || []).some(
      (p) => p.chatUUID === item.uuid,
    );
    return (
      <ChatListItem
        item={item}
        isSelected={selectedItems.includes(item.uuid)}
        isActive={item.uuid === selectedChatUUID && !isSmallScreen}
        isPinned={isPinned}
        unreadCount={item.unreadCount}
        isSidebarCollapsed={showCollapsedSidebar}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    );
  };

  return (
    <>
      {isSelectionMode
        ? renderSelectionHeader()
        : isForwarding
          ? renderForwardingHeader()
          : hasShareIntent
            ? renderIntentHeader()
            : renderDefaultHeader()}

      <FlashList
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        data={orderedChats}
        keyExtractor={(item) => item.uuid}
        renderItem={renderItem}
        extraData={selectedItems}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {!showCollapsedSidebar && (
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
          position={{
            bottom: isSmallScreen ? 100 : 25,
            right: 20,
          }}
        />
      )}

      <CreateChatModal
        ref={createChatModalRef}
        visible={isCreateChatModalVisible}
        onClose={() => setIsCreateChatModalVisible(false)}
      />
    </>
  );
};

function createStyle(theme, isSmallScreen, insets, hasComms) {
  return StyleSheet.create({
    flatList: {
      flex: 1,
      overflow: "hidden",
      ...ScrollBar(theme),
    },
    flatListContent: {
      padding: 10,
      paddingTop: (hasComms ? 140 : 75) + insets.top + 10,
      paddingBottom: (isSmallScreen ? 180 : 90) + insets.bottom,
    },
    logo: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
    },
  });
}

export default React.memo(ChatList);
