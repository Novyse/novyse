import React from "react";
import { FlatList, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MessageBase from "../../messages/MessageBase";
import MessageSystem from "../../messages/MessageSystem";

const createStyle = (theme, insets) =>
  StyleSheet.create({
    list: {
      flex: 1,
      paddingTop: 50 + insets.bottom,
      paddingBottom: 150,
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
      padding: 10,
    },
  });

const MessageList = ({ ref: flatListRef, preparedMessages, myUUID, theme }) => {
  const insets = useSafeAreaInsets();
  const styles = createStyle(theme, insets);

  const renderMessageItem = ({ item }) => {
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
          onLongPress={(e) => {
            console.log("Long press on message:", message.id);
          }}
        />
      );
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={preparedMessages}
      keyExtractor={(item) => item.uniqueKey}
      renderItem={renderMessageItem}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={true}
      scrollIndicatorInsets={{ right: 1 }}
      inverted
    />
  );
};

export default MessageList;
