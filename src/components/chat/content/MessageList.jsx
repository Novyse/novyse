import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBase from "@/src/components/messages/MessageBase";
import MessageSystem from "@/src/components/messages/MessageSystem";

import ActionMenu from "@/src/components/messages/ActionMenu";
import Icon from "@/src/components/Icon";

const createStyle = (theme, insets) =>
  StyleSheet.create({
    list: {
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
    },
    listContent: {
      paddingTop: 70 + insets.top,
      paddingBottom: 70 + insets.bottom,
    },
    scrollButtonContainer: {
      position: "absolute",
      right: 20,
      bottom: 80 + insets.bottom,
      width: 50,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.primary,
      borderRadius: 25,
      elevation: 5,
      zIndex: 10,
    },
  });

const MessageList = ({
  ref: flatListRef,
  preparedMessages,
  myUUID,
  theme,
  onReply,
  onEdit,
  onDelete,
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

  const onAction = useCallback(
    (action) => {
      console.log("Action selected:", action);
      setTriggeredMessage(null);

      switch (action) {
        case "Reply":
          onReply && onReply(triggeredMessage);
          break;
        case "Forward":
          // Implement forward logic here
          console.log("Forwarding message:", triggeredMessage);
          break;
        case "Copy":
          // Implement copy logic here
          console.log("Copying message:", triggeredMessage);
          break;
        case "Select":
          setSelectedMessage((prev) => {
            return [...prev, triggeredMessage];
          });
          break;
        case "Edit":
          onEdit && onEdit(triggeredMessage);
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
            isSender={message.senderUUID === myUUID}
            isSelected={selectedMessage.includes(message)}
            setTriggeredMessage={setTriggeredMessage}
            setTriggeredMessagePosition={setTriggeredMessagePosition}
            selectedMessage={selectedMessage}
            setSelectedMessage={setSelectedMessage}
          />
        );
      }
    },
    [myUUID, selectedMessage],
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
            size={32}
            color={theme.text}
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        </View>
      )}
      <ActionMenu
        visible={!!triggeredMessage}
        onAction={onAction}
        onClose={handleClose}
        position={triggeredMessagePosition}
        isEditedAllowed={isEditedAllowed}
        isDeletedAllowed={isDeletedAllowed}
      />
    </>
  );
};

export default React.memo(MessageList);
