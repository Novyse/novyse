import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useContext,
} from "react";
import { StyleSheet, AppState, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { FlashList, type FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import useMessageActions from "@/src/hooks/chat/useMessageActions";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";
import useChatStore from "@/src/store/ChatStore";
import { ThemeContext } from "@/src/context/ThemeContext";

import MessageBase from "@/src/components/features/messages/MessageBase";
import MessageSystem from "@/src/components/features/messages/MessageSystem";
import ActionMenu from "@/src/components/features/messages/ActionMenu/ActionMenuContextMenu";
import BlurredView from "@/src/components/layout/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";

import { ScrollBar } from "@/constants/ScrollBar";
import { getPlatform } from "@/src/utils/device/type";

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 70 };

export type PreparedListItem = {
  type: string;
  data: any;
  uniqueKey: string;
};

type HighlightedRange = {
  messageID: string | number;
  rangeStart: number;
  rangeEnd: number;
} | null;

type MessageListProps = {
  ref: React.RefObject<FlashListRef<PreparedListItem> | null>;
  preparedMessages: PreparedListItem[];
  editedMessages: any[];
  pinnedMessages: any[];
  selectedMessages: any[];
  setSelectedMessages: React.Dispatch<React.SetStateAction<any[]>>;
  myUUID: string;
  onRead: (maxUnreadID: number) => void;
  onPin: (...args: any[]) => void;
  onUnpin: (...args: any[]) => void;
  onReply: (...args: any[]) => void;
  onCopy: (...args: any[]) => void;
  onDownload: (...args: any[]) => void;
  onEdit: (...args: any[]) => void;
  onEditMessage: (...args: any[]) => void;
  onCancel: (...args: any[]) => void;
  onDelete: (...args: any[]) => void;
  onReaction: (...args: any[]) => void;
  onForward: (...args: any[]) => void;
  onLoadMore: () => void;
  bottomBarHeight?: number;
};

const MessageList = ({
  ref: flatListRef,
  preparedMessages,
  editedMessages,
  pinnedMessages,
  selectedMessages,
  setSelectedMessages,
  myUUID,
  onRead,
  onPin,
  onUnpin,
  onReply,
  onCopy,
  onDownload,
  onEdit,
  onEditMessage,
  onCancel,
  onDelete,
  onReaction,
  onForward,
  onLoadMore,
  bottomBarHeight = 0,
}: MessageListProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const styles = useMemo(
    () => createStyle(theme, insets, bottomBarHeight),
    [theme, insets, bottomBarHeight],
  );

  const [highlightedID, setHighlightedID] = useState<string | number | null>(
    null,
  );
  const [highlightedRange, setHighlightedRange] =
    useState<HighlightedRange>(null);
  const [historyStack, setHistoryStack] = useState<(string | number)[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const pendingReadsRef = useRef(new Set<string | number>());
  const scrollAttemptsRef = useRef(0);
  const didScrollToEndOnOpenRef = useRef(false);

  useEffect(() => {
    if (!selectedMessages?.length) return;

    const clearSelection = () => setSelectedMessages([]);

    if (getPlatform() !== "mobile") {
      if (typeof document === "undefined") return;
      document.addEventListener("copy", clearSelection);
      return () => document.removeEventListener("copy", clearSelection);
    }

    const subscription = Clipboard.addClipboardListener(clearSelection);
    return () => subscription.remove();
  }, [selectedMessages?.length, setSelectedMessages]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        (nextAppState === "inactive" || nextAppState === "background") &&
        selectedMessages?.length > 0
      ) {
        setSelectedMessages([]);
      }
    });
    return () => subscription.remove();
  }, [selectedMessages, setSelectedMessages]);

  const findMessageIndex = useCallback(
    (messageID: string | number, chatUUID?: string | null) => {
      return preparedMessages.findIndex(
        (m) =>
          m.type !== "separator" &&
          m.type !== "separator-with-lines" &&
          String(m.data?.id) === String(messageID) &&
          (chatUUID == null || String(m.data?.chatUUID) === String(chatUUID)),
      );
    },
    [preparedMessages],
  );

  const highlightMessage = useCallback(
    (
      messageID: string | number,
      rangeStart?: number | null,
      rangeEnd?: number | null,
    ) => {
      setHighlightedID(messageID);
      if (rangeStart != null && rangeEnd != null) {
        setTimeout(() => {
          setHighlightedID(null);
          setHighlightedRange({ messageID, rangeStart, rangeEnd });
          setTimeout(() => setHighlightedRange(null), 3000);
        }, 1000);
      } else {
        setTimeout(() => setHighlightedID(null), 2000);
      }
    },
    [],
  );

  const scrollToMessage = useCallback(
    (messageID: string | number, chatUUID?: string | null) => {
      const index = findMessageIndex(messageID, chatUUID);
      if (index < 0) return false;
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      return true;
    },
    [findMessageIndex, flatListRef],
  );

  const navigateToMessageWithHistory = useCallback(
    (
      chatUUID: string,
      messageID: string | number,
      _oldChatUUID?: string,
      oldMessageID?: string | number,
      rangeStart?: number | null,
      rangeEnd?: number | null,
    ) => {
      if (!scrollToMessage(messageID, chatUUID)) return;
      if (oldMessageID) {
        setHistoryStack((prev) => [...prev, oldMessageID]);
      }
      highlightMessage(messageID, rangeStart, rangeEnd);
    },
    [scrollToMessage, highlightMessage],
  );

  const scrollToMessageID = useActiveChatStore(
    (state) => state.scrollToMessageID,
  );
  const setScrollToMessageID = useActiveChatStore(
    (state) => state.setScrollToMessageID,
  );
  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const messageHighlight = useActiveChatStore(
    (state) => state.messageHighlight,
  );
  const ensureMessageLoaded = useChatStore(
    (state) => state.ensureMessageLoaded,
  );

  useEffect(() => {
    didScrollToEndOnOpenRef.current = false;
  }, [selectedChatUUID, selectedSub]);

  useEffect(() => {
    if (didScrollToEndOnOpenRef.current || !preparedMessages?.length) return;
    didScrollToEndOnOpenRef.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }, [preparedMessages, flatListRef, selectedChatUUID, selectedSub]);

  useEffect(() => {
    if (!scrollToMessageID) {
      scrollAttemptsRef.current = 0;
      return;
    }

    const jumped = scrollToMessage(scrollToMessageID, selectedChatUUID);
    if (jumped) {
      const isSearchJump =
        messageHighlight &&
        String(messageHighlight.messageID) === String(scrollToMessageID);
      highlightMessage(
        scrollToMessageID,
        isSearchJump ? messageHighlight.rangeStart : undefined,
        isSearchJump ? messageHighlight.rangeEnd : undefined,
      );
      setScrollToMessageID(null);
      scrollAttemptsRef.current = 0;
    } else if (selectedChatUUID) {
      ensureMessageLoaded(
        selectedChatUUID,
        selectedSub ?? 0,
        scrollToMessageID,
      );
      scrollAttemptsRef.current += 1;
      if (scrollAttemptsRef.current > 40) {
        setScrollToMessageID(null);
        scrollAttemptsRef.current = 0;
      }
    }
  }, [
    scrollToMessageID,
    preparedMessages,
    selectedChatUUID,
    selectedSub,
    messageHighlight,
    ensureMessageLoaded,
    scrollToMessage,
    highlightMessage,
    setScrollToMessageID,
  ]);

  const {
    triggeredMessage,
    setTriggeredMessage,
    triggeredMessagePosition,
    setTriggeredMessagePosition,
    isEditedAllowed,
    isDeletedAllowed,
    isPinnedAllowed,
    onAction,
    handleClose,
  } = useMessageActions({
    myUUID,
    onSelected: (currentMsg: any) =>
      setSelectedMessages((prev) => [...prev, currentMsg]),
    onPin,
    onUnpin,
    onReply,
    onCopy,
    onDownload,
    onEdit,
    onCancel,
    onDelete,
    onReaction,
    onForward,
  });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      if (contentSize.height === 0) return;

      const distanceToBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setShowScrollButton(distanceToBottom > 200);

      if (distanceToBottom < 20) {
        setHistoryStack([]);
      }
    },
    [],
  );

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item?: PreparedListItem }[] }) => {
      if (!viewableItems?.length) return;

      let maxUnreadID = 0;
      const unreadIDsInView: Array<string | number> = [];

      for (const v of viewableItems) {
        const msg = v.item?.data;
        if (!msg || v.item?.type === "separator") continue;
        if (msg.senderUUID === myUUID) continue;

        const isReadByMe = msg.readBy?.some(
          (r: { userUUID: string }) => r.userUUID === myUUID,
        );
        if (!isReadByMe && !pendingReadsRef.current.has(msg.id)) {
          const numericID = Number(msg.id);
          if (numericID > maxUnreadID) maxUnreadID = numericID;
          unreadIDsInView.push(msg.id);
        }
      }

      if (maxUnreadID > 0) {
        unreadIDsInView.forEach((id) => pendingReadsRef.current.add(id));
        onRead(maxUnreadID);
      }
    },
    [myUUID, onRead],
  );

  const renderMessageItem = useCallback(
    ({ item }: ListRenderItemInfo<PreparedListItem>) => {
      if (item.type === "separator") {
        return <MessageSystem type="date" data={item.data} />;
      }
      if (item.type === "separator-with-lines") {
        return <MessageSystem type="separator-with-lines" data={item.data} />;
      }
      if (item.type === "system") {
        return <MessageSystem type="system" data={item.data} />;
      }

      const message = item.data;
      const isSearchTarget =
        messageHighlight &&
        String(messageHighlight.messageID) === String(message.id) &&
        (messageHighlight.subID === undefined ||
          messageHighlight.subID === (message.subID ?? 0));
      const searchRange = isSearchTarget
        ? {
            messageID: message.id,
            rangeStart: messageHighlight.rangeStart,
            rangeEnd: messageHighlight.rangeEnd,
          }
        : null;

      return (
        <MessageBase
          message={message}
          onReply={onReply}
          onReaction={onReaction}
          onEditMessage={onEditMessage}
          isSender={message.senderUUID === myUUID}
          isSelected={selectedMessages.some((msg) => msg.id === message.id)}
          isHighlighted={message.id == highlightedID}
          highlightedRange={
            searchRange ||
            (highlightedRange?.messageID === message.id
              ? highlightedRange
              : null)
          }
          isEdited={editedMessages.some(
            (p) =>
              (p.messageID || p) == message.id &&
              (p.subID === undefined || p.subID === message.subID),
          )}
          isPinned={pinnedMessages.some(
            (p) =>
              (p.messageID || p) == message.id &&
              (p.subID === undefined || p.subID === message.subID),
          )}
          repliedCount={message.repliedFroms?.length || 0}
          setTriggeredMessage={setTriggeredMessage}
          setTriggeredMessagePosition={setTriggeredMessagePosition}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          navigateToMessageWithHistory={navigateToMessageWithHistory}
        />
      );
    },
    [
      myUUID,
      selectedMessages,
      editedMessages,
      pinnedMessages,
      highlightedID,
      highlightedRange,
      messageHighlight,
      onReply,
      onReaction,
      onEditMessage,
      setTriggeredMessage,
      setTriggeredMessagePosition,
      setSelectedMessages,
      navigateToMessageWithHistory,
    ],
  );

  const handleScrollButton = useCallback(() => {
    if (historyStack.length > 0) {
      const lastHistoryId = historyStack[historyStack.length - 1];
      if (scrollToMessage(lastHistoryId)) {
        highlightMessage(lastHistoryId);
      }
      setHistoryStack((prev) => prev.slice(0, -1));
      return;
    }
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [flatListRef, historyStack, scrollToMessage, highlightMessage]);

  return (
    <>
      <FlashList
        ref={flatListRef}
        data={preparedMessages}
        estimatedItemSize={80}
        keyExtractor={(item) => item.uniqueKey}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1, ...ScrollBar(theme) }}
        renderItem={renderMessageItem}
        onScroll={handleScroll}
        onStartReached={onLoadMore}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
      />
      {showScrollButton && (
        <BlurredView style={styles.scrollButtonContainer}>
          <Icon
            name="ArrowDown01Icon"
            size={33}
            color={theme.text}
            onPress={handleScrollButton}
          />
        </BlurredView>
      )}
      <ActionMenu
        visible={!!triggeredMessage}
        message={triggeredMessage}
        onAction={onAction}
        onClose={handleClose}
        position={triggeredMessagePosition}
        isPinned={pinnedMessages.some(
          (p) =>
            (p.messageID || p) == triggeredMessage?.id &&
            (p.subID === undefined || p.subID === triggeredMessage?.subID),
        )}
        isEditedAllowed={isEditedAllowed}
        isDeletedAllowed={isDeletedAllowed}
        isPinnedAllowed={isPinnedAllowed}
        isDownloadAllowed={triggeredMessage?.files?.length > 0}
        isPendingSend={triggeredMessage?.internal === true}
        pendingEditJobId={triggeredMessage?.pendingEditJobId}
      />
    </>
  );
};

export default React.memo(MessageList);

const createStyle = (theme: any, insets: EdgeInsets, bottomBarHeight = 0) =>
  StyleSheet.create({
    listContent: {
      paddingTop: 65 + insets.top,
      paddingBottom: Math.max(60, bottomBarHeight) + insets.bottom,
    },
    scrollButtonContainer: {
      position: "absolute",
      right: 10,
      bottom: Math.max(80, bottomBarHeight + 20) + insets.bottom,
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      elevation: 5,
      zIndex: 10,
    },
  });
