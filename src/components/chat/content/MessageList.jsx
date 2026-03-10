import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";

import ActionMenu from "@/src/components/messages/ActionMenu";
import Icon from "@/src/components/Icon";
import useMessageActions from "@/src/hooks/chat/useMessageActions";

const MessageList = ({
  ref: flatListRef,
  replyNavigation,
  preparedMessages,
  editedMessages,
  pinnedMessages,
  myUUID,
  theme,
  onPin,
  onUnpin,
  onReply,
  onCopy,
  onDownload,
  onEdit,
  onCancel,
  onDelete,
  onReaction,
  onLoadMore,
}) => {
  const insets = useSafeAreaInsets();
  const styles = createStyle(theme, insets);

  const [highlightedID, setHighlightedID] = useState(null);

  useEffect(() => {
    if (
      replyNavigation &&
      replyNavigation.messageID &&
      preparedMessages.length > 0
    ) {
      const { messageID, time } = replyNavigation;
      const index = preparedMessages.findIndex(
        (m) =>
          m.type !== "separator" && String(m.data?.id) === String(messageID),
      );

      if (index !== -1) {
        setHighlightedID(messageID);

        // Clear highlight after 3 seconds
        const hTimer = setTimeout(() => setHighlightedID(null), 3000);

        const scrollTimer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }, 300);

        return () => {
          clearTimeout(hTimer);
          clearTimeout(scrollTimer);
        };
      }
    }
  }, [replyNavigation, preparedMessages, flatListRef]);

  const {
    triggeredMessage,
    setTriggeredMessage,
    triggeredMessagePosition,
    setTriggeredMessagePosition,
    selectedMessage,
    setSelectedMessage,
    isEditedAllowed,
    isDeletedAllowed,
    onAction,
    handleClose,
  } = useMessageActions({
    myUUID,
    onPin,
    onUnpin,
    onReply,
    onCopy,
    onDownload,
    onEdit,
    onCancel,
    onDelete,
    onReaction,
  });

  const [showScrollButton, setShowScrollButton] = useState(false);
  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height === 0) return;

    // For startRenderingFromBottom: true, scrolling up means contentOffset.y decreases.
    const distanceToBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollButton(distanceToBottom > 200); // Only show when scrolling up significantly
  }, []);

  const renderMessageItem = useCallback(
    ({ item }) => {
      if (item.type === "separator") {
        return <MessageSystem type={"date"} data={item.data} />;
      } else if (item.type === "system") {
        return <MessageSystem type={"system"} data={item.data} />;
      } else {
        const message = item.data;
        return (
          <MessageBase
            message={message}
            onReply={onReply}
            onReaction={onReaction}
            isSender={message.senderUUID === myUUID}
            isSelected={selectedMessage.includes(message)}
            isHighlighted={message.id == highlightedID}
            isEdited={editedMessages.some(
              (p) => (p.messageID || p) == message.id,
            )}
            isPinned={pinnedMessages.some(
              (p) => (p.messageID || p) == message.id,
            )}
            setTriggeredMessage={setTriggeredMessage}
            setTriggeredMessagePosition={setTriggeredMessagePosition}
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
          />
        );
      }
    },
    [
      myUUID,
      selectedMessage,
      editedMessages,
      pinnedMessages,
      highlightedID,
      onReply,
      onReaction,
      setTriggeredMessage,
      setTriggeredMessagePosition,
      setSelectedMessage,
    ],
  );
  const [isJumpBackMode, setIsJumpBackMode] = useState(false);

  useEffect(() => {
    if (replyNavigation?.oldMessageID) {
      setIsJumpBackMode(true);
      // Mode stays for a while after the jump
      const timer = setTimeout(() => setIsJumpBackMode(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [replyNavigation]);

  const handleScrollButton = useCallback(() => {
    if (isJumpBackMode && replyNavigation?.oldMessageID) {
      const index = preparedMessages.findIndex(
        (m) =>
          m.type !== "separator" &&
          String(m.data?.id) === String(replyNavigation.oldMessageID),
      );

      if (index !== -1) {
        setHighlightedID(replyNavigation.oldMessageID);
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setIsJumpBackMode(false);
        return;
      }
    }
    // Default scroll to bottom
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [isJumpBackMode, replyNavigation, preparedMessages, flatListRef]);

  return (
    <>
      <FlashList
        ref={flatListRef}
        data={preparedMessages}
        keyExtractor={(item) => item.uniqueKey}
        renderItem={renderMessageItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 1 }}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 0.1,
          startRenderingFromBottom: true,
          animateAutoScrollToBottom: true,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onStartReached={onLoadMore}
        onStartReachedThreshold={0.5}
        estimatedItemSize={100}
      />
      {showScrollButton && (
        <View style={styles.scrollButtonContainer}>
          <Icon
            name={"ArrowDown01Icon"}
            size={33}
            color={theme.text}
            onPress={handleScrollButton}
          />
        </View>
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

const createStyle = (theme, insets) =>
  StyleSheet.create({
    list: {
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
    },
    listContent: {
      paddingTop: 70 + insets.top,
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
      backgroundColor: theme.primary,
      borderRadius: 25,
      elevation: 5,
      zIndex: 10,
    },
  });
