import React, { useState, useCallback } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";

import ActionMenu from "@/src/components/messages/ActionMenu";
import Icon from "@/src/components/Icon";
import useMessageActions from "@/src/hooks/chat/useMessageActions";

const RenderScrollComponent = React.forwardRef((props, ref) => (
  <KeyboardChatScrollView {...props} ref={ref} />
));

const MessageList = ({
  ref: flatListRef,
  preparedMessages,
  editedMessages,
  pinnedMessages,
  selectedMessages,
  setSelectedMessages,
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
  onForward,
  onLoadMore,
}) => {
  const insets = useSafeAreaInsets();
  const styles = createStyle(theme, insets);

  const [highlightedID, setHighlightedID] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);

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
    [preparedMessages, flatListRef]
  );

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
        (m) => m.type !== "separator" && String(m.data?.id) === String(lastHistoryId)
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
        keyExtractor={(item) => item.uniqueKey}
        renderItem={renderMessageItem}
        renderScrollComponent={RenderScrollComponent}
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
