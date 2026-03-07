import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";

import ActionMenu from "@/src/components/messages/ActionMenu";
import Icon from "@/src/components/Icon";

const MessageList = ({
  ref: flatListRef,
  preparedMessages,
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

  const [triggeredMessage, setTriggeredMessage] = useState(null);
  const [triggeredMessagePosition, setTriggeredMessagePosition] = useState({
    x: 0,
    y: 0,
  });

  const [selectedMessage, setSelectedMessage] = useState([]);
  const [isEditedAllowed, setIsEditedAllowed] = useState(false);
  const [isDeletedAllowed, setIsDeletedAllowed] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentSize.height === 0) return;

    // For startRenderingFromBottom: true, scrolling up means contentOffset.y decreases.
    const distanceToBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollButton(distanceToBottom > 200); // Only show when scrolling up significantly
  }, []);

  useEffect(() => {
    if (triggeredMessage) {
      setIsEditedAllowed(
        onEdit !== null && triggeredMessage.senderUUID === myUUID,
      );
      setIsDeletedAllowed(
        onDelete !== null && triggeredMessage.senderUUID === myUUID,
      );
    }
  }, [triggeredMessage, onEdit, onDelete]);

  // Auto-scroll to bottom when user sends a new message
  useEffect(() => {
    if (preparedMessages.length > 0) {
      const lastMessage = preparedMessages[preparedMessages.length - 1];
      if (
        lastMessage.type === "text" &&
        lastMessage.data.senderUUID === myUUID
      ) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      }
    }
  }, [preparedMessages, myUUID]);

  const onAction = useCallback(
    (action) => {
      console.log("Action selected:", action);
      setTriggeredMessage(null);

      switch (action) {
        case "Pin":
          onPin && onPin(triggeredMessage);
          break;
        case "Unpin":
          onUnpin && onUnpin(triggeredMessage);
          break;
        case "Reply":
          onReply && onReply(triggeredMessage);
          break;
        case "Forward":
          // Implement forward logic here
          console.log("Forwarding message:", triggeredMessage);
          break;
        case "Copy":
          onCopy && onCopy(triggeredMessage);
          break;
        case "Download":
          onDownload && onDownload(triggeredMessage);
          break;
        case "Select":
          setSelectedMessage((prev) => {
            return [...prev, triggeredMessage];
          });
          break;
        case "Edit":
          onEdit && onEdit(triggeredMessage);
          break;
        case "Cancel":
        case "Cancel Edit":
          onCancel && onCancel(triggeredMessage);
          break;
        case "Delete":
          onDelete && onDelete(triggeredMessage);
          break;
        default:
          console.warn("Unknown action:", action);
      }
    },
    [triggeredMessage, onReply, onEdit, onDelete],
  );

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
            isPinned={pinnedMessages.includes(message.id)}
            setTriggeredMessage={setTriggeredMessage}
            setTriggeredMessagePosition={setTriggeredMessagePosition}
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
          />
        );
      }
    },
    [myUUID, selectedMessage, pinnedMessages],
  );

  const handleClose = useCallback(() => setTriggeredMessage(null), []);

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
          autoscrollToBottomThreshold: 0.2,
          startRenderingFromBottom: true,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onStartReached={onLoadMore}
        onStartReachedThreshold={0.5}
      />
      {showScrollButton && (
        <View style={styles.scrollButtonContainer}>
          <Icon
            name="ArrowDown01Icon"
            size={33}
            color={theme.text}
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>
      )}
      <ActionMenu
        visible={!!triggeredMessage}
        onAction={onAction}
        onClose={handleClose}
        onReaction={onReaction}
        position={triggeredMessagePosition}
        isPinned={pinnedMessages.includes(triggeredMessage?.id)}
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
