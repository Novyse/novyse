import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import AppText from "@/src/components/AppText";
import { useThemeContext } from "@/src/context/ThemeContext";

import messageUtils from "@/src/utils/chat/messageFormat";

import Icon from "@/src/components/Icon";

const MessageReply = ({
  senderName,
  message,
  chatUUID,
  messageID,
  rangeStart,
  rangeEnd,
  oldChatUUID,
  oldMessageID,
  navigateToMessageWithHistory,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [text, setText] = useState("");
  const isQuote = rangeStart != null && rangeEnd != null;

  useEffect(() => {
    const formatted = messageUtils.format(message);
    if (isQuote) {
      const sliced = formatted.content?.substring(rangeStart, rangeEnd);
      setText(sliced || formatted.content);
    } else {
      setText(formatted.content);
    }
  }, [message, rangeStart, rangeEnd, isQuote]);

  return (
    <Pressable
      style={styles.container}
      onPress={() =>
        navigateToMessageWithHistory(
          chatUUID,
          messageID,
          oldChatUUID,
          oldMessageID,
          rangeStart,
          rangeEnd,
        )
      }
    >
      <View style={styles.innerContainer}>
        <View style={styles.accent} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <AppText
              style={styles.senderName}
              numberOfLines={1}
              text={senderName ?? "Unknown"}
            />
            {isQuote && <Icon name="QuoteIcon" size={14} color={theme.icon} />}
          </View>
          <AppText style={styles.text} numberOfLines={2} text={text ?? ""} />
        </View>
      </View>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 10,
      paddingTop: 10,
    },
    innerContainer: {
      flexDirection: "row",
      borderRadius: 10,
      overflow: "hidden",
      minHeight: 45,
    },
    accent: {
      width: 4,
      backgroundColor: theme.primary,
    },
    content: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
      justifyContent: "center",
      backgroundColor: theme.secondary + "30",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    senderName: {
      fontWeight: "600",
      fontSize: 12,
      color: theme.icon,
    },
    text: {
      fontSize: 12,
      color: theme.placeholderText,
      lineHeight: 16,
    },
  });

export default MessageReply;
