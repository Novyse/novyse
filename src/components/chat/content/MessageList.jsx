import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { StyleSheet, AppState } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import useMessageActions from "@/src/hooks/chat/useMessageActions";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";
import ActionMenu from "@/src/components/messages/ActionMenu";
import BlurredView from "@/src/components/BlurredView";
import Icon from "@/src/components/Icon";

import { ScrollBar } from "@/constants/ScrollBar";

const MessageList = ({
  ref: flatListRef,
  preparedMessages,
  editedMessages,
  pinnedMessages,
  selectedMessages,
  setSelectedMessages,
  myUUID,
  theme,
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
}) => {
  const insets = useSafeAreaInsets();
  const headerHeight = useActiveChatStore((state) => state.headerHeight);
  const styles = useMemo(
    () => createStyle(theme, insets, headerHeight),
    [theme, insets, headerHeight],
  );

  const [highlightedID, setHighlightedID] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const initialScrollIndexRef = useRef(null);

  // Exit selection mode if the user copies something to the clipboard
  useEffect(() => {
    let subscription = null;
    if (selectedMessages && selectedMessages.length > 0) {
      subscription = Clipboard.addClipboardListener(() => {
        setSelectedMessages([]);
      });
    }
    return () => {
      if (subscription) subscription.remove();
    };
  }, [selectedMessages?.length, setSelectedMessages]);

  // Exit selection mode if the app goes to the background (e.g., opens native Share or Translate menu)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "inactive" || nextAppState === "background") {
        if (selectedMessages && selectedMessages.length > 0) {
          setSelectedMessages([]);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [selectedMessages, setSelectedMessages]);

  if (
    initialScrollIndexRef.current === null &&
    preparedMessages &&
    preparedMessages.length > 0
  ) {
    const unreadIdx = preparedMessages.findIndex(
      (m) => m.uniqueKey === "unread-separator",
    );
    initialScrollIndexRef.current =
      unreadIdx !== -1 ? Math.max(0, unreadIdx - 2) : undefined;
  }

  const navigateToMessageWithHistory = useCallback(
    (chatUUID, messageID, oldChatUUID, oldMessageID) => {
      const index = preparedMessages.findIndex(
        (m) =>
          m.type !== "separator" &&
          String(m.data?.id) === String(messageID) &&
          String(m.data?.chatUUID) === String(chatUUID),
      );

      if (index !== -1) {
        if (oldMessageID) {
          setHistoryStack((prev) => [...prev, oldMessageID]);
        }

        setHighlightedID(messageID);
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });

        // Autoclear highlight after a short delay
        setTimeout(() => setHighlightedID(null), 2000);
      }
    },
    [preparedMessages, flatListRef],
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

  useEffect(() => {
    if (scrollToMessageID) {
      navigateToMessageWithHistory(selectedChatUUID, scrollToMessageID);
      setScrollToMessageID(null);
    }
  }, [
    scrollToMessageID,
    selectedChatUUID,
    navigateToMessageWithHistory,
    setScrollToMessageID,
  ]);

  const {
    triggeredMessage,
    setTriggeredMessage,
    triggeredMessagePosition,
    setTriggeredMessagePosition,
    isEditedAllowed,
    isDeletedAllowed,
    onAction,
    handleClose,
  } = useMessageActions({
    myUUID,
    onSelected: (currentMsg) =>
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

  const [showScrollButton, setShowScrollButton] = useState(false);
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height === 0) return;

    // For startRenderingFromBottom: true, scrolling up means contentOffset.y decreases.
    const distanceToBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollButton(distanceToBottom > 200); // Only show when scrolling up significantly

    // Se l'utente scrolla manualmente fino in fondo spezziamo la history
    if (distanceToBottom < 20) {
      setHistoryStack([]);
    }
  }, []);

  const pendingReadsRef = React.useRef(new Set());

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      let maxUnreadID = 0;
      const unreadIDsInView = [];

      for (const v of viewableItems) {
        const msg = v.item?.data;
        if (!msg || v.item.type === "separator") continue;

        if (msg.senderUUID === myUUID) continue;

        const isReadByMe =
          msg.readBy && msg.readBy.some((r) => r.userUUID === myUUID);

        if (!isReadByMe && !pendingReadsRef.current.has(msg.id)) {
          const numericID = Number(msg.id);
          if (numericID > maxUnreadID) {
            maxUnreadID = numericID;
          }
          unreadIDsInView.push(msg.id);
        }
      }

      if (maxUnreadID > 0) {
        // Mark all these as pending immediately to avoid duplicate triggers
        unreadIDsInView.forEach((id) => pendingReadsRef.current.add(id));
        onRead(maxUnreadID);
      }
    },
    [myUUID, onRead],
  );

  const renderMessageItem = useCallback(
    ({ item }) => {
      if (item.type === "separator") {
        return <MessageSystem type={"date"} data={item.data} />;
      } else if (item.type === "separator-with-lines") {
        return <MessageSystem type={"separator-with-lines"} data={item.data} />;
      } else if (item.type === "system") {
        return <MessageSystem type={"system"} data={item.data} />;
      } else {
        const message = item.data;
        return (
          <MessageBase
            message={message}
            onReply={onReply}
            onReaction={onReaction}
            onEditMessage={onEditMessage}
            isSender={message.senderUUID === myUUID}
            isSelected={selectedMessages.some((msg) => msg.id === message.id)}
            isHighlighted={message.id == highlightedID}
            isEdited={editedMessages.some(
              (p) => (p.messageID || p) == message.id,
            )}
            isPinned={pinnedMessages.some(
              (p) => (p.messageID || p) == message.id,
            )}
            repliedCount={message.repliedFroms?.length || 0}
            setTriggeredMessage={setTriggeredMessage}
            setTriggeredMessagePosition={setTriggeredMessagePosition}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            navigateToMessageWithHistory={navigateToMessageWithHistory}
          />
        );
      }
    },
    [
      myUUID,
      selectedMessages,
      editedMessages,
      pinnedMessages,
      highlightedID,
      onReply,
      onReaction,
      onEditMessage,
      setTriggeredMessage,
      setTriggeredMessagePosition,
      setTriggeredMessage,
      setTriggeredMessagePosition,
      setSelectedMessages,
    ],
  );

  const handleScrollButton = useCallback(() => {
    if (historyStack.length > 0) {
      const lastHistoryId = historyStack[historyStack.length - 1];
      const index = preparedMessages.findIndex(
        (m) =>
          m.type !== "separator" &&
          String(m.data?.id) === String(lastHistoryId),
      );

      if (index !== -1) {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedID(lastHistoryId);
        setTimeout(() => setHighlightedID(null), 2000);
      }

      setHistoryStack((prev) => prev.slice(0, -1));
    } else {
      // Default scroll to bottom
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [flatListRef, historyStack, preparedMessages]);

  return (
    <>
      <FlashList
        ref={flatListRef}
        data={preparedMessages}
        initialScrollIndex={
          initialScrollIndexRef.current !== null
            ? initialScrollIndexRef.current
            : undefined
        }
        keyExtractor={(item) => item.uniqueKey}
        renderItem={renderMessageItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 1 }}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 0.1,
          startRenderingFromBottom: initialScrollIndexRef.current === undefined,
          animateAutoScrollToBottom: true,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onStartReached={onLoadMore}
        onStartReachedThreshold={0.5}
        estimatedItemSize={100}
        viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
        onViewableItemsChanged={handleViewableItemsChanged}
      />
      {showScrollButton && (
        <BlurredView style={styles.scrollButtonContainer}>
          <Icon
            name={"ArrowDown01Icon"}
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
          (p) => (p.messageID || p) == triggeredMessage?.id,
        )}
        isEditedAllowed={isEditedAllowed}
        isDeletedAllowed={isDeletedAllowed}
        isDownloadAllowed={triggeredMessage?.files?.length > 0}
        isPendingSend={triggeredMessage?.internal === true}
        pendingEditJobId={triggeredMessage?.pendingEditJobId}
      />
    </>
  );
};

export default React.memo(MessageList);

const createStyle = (theme, insets, headerHeight = 0) =>
  StyleSheet.create({
    list: {
      flex: 1,
      ...ScrollBar(theme),
    },
    listContent: {
      paddingTop: Math.max(70, headerHeight + 10) + insets.top,
      paddingBottom: 70 + insets.bottom,
    },
    scrollButtonContainer: {
      position: "absolute",
      right: 10,
      bottom: 80 + insets.bottom,
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      elevation: 5,
      zIndex: 10,
    },
  });
