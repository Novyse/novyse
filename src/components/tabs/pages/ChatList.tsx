import React, { useState, useContext, useCallback, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import AppText from "@/src/components/AppText";
import { useShareIntentContext } from "expo-share-intent";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router/react-navigation";

import { Chat } from "@/src/types/chat";

import Icon from "@/src/components/Icon";
import AppHeader from "@/src/components/header/AppHeader";
import { headerIconButtonStyle } from "@/src/components/header/AppHeaderRow";
import {
  COMMS_HEADER_OFFSET,
  getAppHeaderScrollPaddingTop,
} from "@/src/components/header/constants";
import ChatListItem from "@/src/components/chat/list/Item";
import ChatListHeader from "@/src/components/chat/list/header/ChatListHeader";
import StatusHeader from "@/src/components/chat/list/header/StatusHeader";
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
import { useStatusBannerOffset } from "@/src/hooks/useStatusBannerOffset";

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
  const statusBannerOffset = useStatusBannerOffset();

  const {
    selectedItems,
    isSelectionMode,
    toggleSelection,
    initiateSelection,
    clearSelection,
  } = useSelection<string>();

  const styles = createStyle(
    theme,
    isSmallScreen,
    insets,
    hasComms,
    statusBannerOffset,
  );

  const [orderedChats, setOrderedChats] = useState<any[]>([]);

  const [isCreateChatModalVisible, setIsCreateChatModalVisible] =
    useState(false);

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
      <ChatListHeader
        commsHeader={commsHeaderComponent}
        collapsed={showCollapsedSidebar}
        onCreateChat={() => setIsCreateChatModalVisible(true)}
      />
    ),
    [commsHeaderComponent, showCollapsedSidebar],
  );

  const renderSelectionHeader = useCallback(
    () => (
      <AppHeader
        left={
          <Icon
            name="Cancel01Icon"
            onPress={clearSelection}
            style={headerIconButtonStyle.iconButton}
          />
        }
        center={
          <AppText
            style={styles.headerTitle}
            translationKey="tabs.chatList.selected"
            translationOptions={{ count: selectedItems.length }}
          />
        }
        right={
          <Icon
            name="PinIcon"
            onPress={handlePinItems}
            style={headerIconButtonStyle.iconButton}
          />
        }
        footer={commsHeaderComponent}
        belowBlur={<StatusHeader />}
      />
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
      <AppHeader
        left={
          <Icon
            name="Cancel01Icon"
            onPress={() => resetShareIntent()}
            style={headerIconButtonStyle.iconButton}
          />
        }
        center={
          <AppText
            style={styles.headerTitle}
            translationKey="tabs.chatList.intentSharing"
          />
        }
        right={<View style={headerIconButtonStyle.iconButton} />}
        footer={commsHeaderComponent}
        belowBlur={<StatusHeader />}
      />
    ),
    [styles.headerTitle, resetShareIntent, commsHeaderComponent],
  );

  const renderForwardingHeader = useCallback(
    () => (
      <AppHeader
        left={
          <Icon
            name="Cancel01Icon"
            onPress={() => resetForwarding()}
            style={headerIconButtonStyle.iconButton}
          />
        }
        center={
          <AppText
            style={styles.headerTitle}
            translationKey="tabs.chatList.forwarding"
          />
        }
        right={<View style={headerIconButtonStyle.iconButton} />}
        footer={commsHeaderComponent}
        belowBlur={<StatusHeader />}
      />
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
    <View style={styles.container}>
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

      <CreateChatModal
        visible={isCreateChatModalVisible}
        onClose={() => setIsCreateChatModalVisible(false)}
      />
    </View>
  );
};

function createStyle(
  theme,
  isSmallScreen,
  insets,
  hasComms,
  statusBannerOffset,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    flatList: {
      flex: 1,
      overflow: "hidden",
      ...ScrollBar(theme),
    },
    flatListContent: {
      padding: 10,
      paddingTop: getAppHeaderScrollPaddingTop(insets.top, {
        commsFooterOffset: hasComms ? COMMS_HEADER_OFFSET : 0,
        statusBannerOffset,
      }),
      paddingBottom: (isSmallScreen ? 180 : 90) + insets.bottom,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
    },
  });
}

export default React.memo(ChatList);
