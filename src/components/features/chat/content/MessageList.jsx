import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useContext
} from "react";
import { StyleSheet, AppState } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import useMessageActions from "@/src/hooks/chat/useMessageActions";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";
import useChatStore from "@/src/store/ChatStore";
import { ThemeContext } from "@/src/context/ThemeContext";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";
import ActionMenu from "@/src/components/messages/ActionMenu";
import BlurredView from "@/src/components/layout/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";

import { ScrollBar } from "@/constants/ScrollBar";

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
}) => {
  const insets = useSafeAreaInsets();
  const {theme} = useContext(ThemeContext);
  const headerHeight = useActiveChatStore((state) => state.headerHeight);
  const styles = useMemo(
    () => createStyle(theme, insets, headerHeight, bottomBarHeight),
    [theme, insets, headerHeight, bottomBarHeight],
  );

  const [highlightedID, setHighlightedID] = useState(null);
  const [highlightedRange, setHighlightedRange] = useState(null);
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
    (chatUUID, messageID, oldChatUUID, oldMessageID, rangeStart, rangeEnd) => {
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

        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        if (rangeStart != null && rangeEnd != null) {
          setHighlightedID(messageID);
          setTimeout(() => {
            setHighlightedID(null);
            setHighlightedRange({ messageID, rangeStart, rangeEnd });
            setTimeout(() => setHighlightedRange(null), 3000);
          }, 1000); // 1 second message highlight, then 3 seconds text highlight
        } else {
          setHighlightedID(messageID);
          setTimeout(() => {
            setHighlightedID(null);
          }, 2000);
        }
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
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const messageHighlight = useActiveChatStore(
    (state) => state.messageHighlight,
  );
  const ensureMessageLoaded = useChatStore(
    (state) => state.ensureMessageLoaded,
  );

  const scrollAttemptsRef = useRef(0);

  useEffect(() => {
    if (!scrollToMessageID) {
      scrollAttemptsRef.current = 0;
      return;
    }

    const index = preparedMessages.findIndex(
      (m) =>
        m.type !== "separator" &&
        String(m.data?.id) === String(scrollToMessageID),
    );

    if (index !== -1) {
      const isSearchJump =
        messageHighlight &&
        String(messageHighlight.messageID) === String(scrollToMessageID);

      if (isSearchJump) {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedID(scrollToMessageID);
        setTimeout(() => setHighlightedID(null), 2000);
      } else {
        navigateToMessageWithHistory(selectedChatUUID, scrollToMessageID);
      }
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
    isPinnedAllowed,
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
      }
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

const createStyle = (theme, insets, headerHeight = 0, bottomBarHeight = 0) =>
  StyleSheet.create({
    list: {
      flex: 1,
      ...ScrollBar(theme),
    },
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
