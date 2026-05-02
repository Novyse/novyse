import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import AppText from "@/src/components/AppText";
import { useThemeContext } from "@/context/ThemeContext";

import messageUtils from "@/src/utils/chat/messageFormat";

const MessageReply = ({
  senderName,
  message,
  chatUUID,
  messageID,
  oldChatUUID,
  oldMessageID,
  navigateToMessageWithHistory,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [text, setText] = useState("");
  useEffect(() => {
    const formatted = messageUtils.format(message);
    setText(formatted.content);
  }, [message]);

  return (
    <Pressable
      style={styles.container}
      onPress={() =>
        navigateToMessageWithHistory(
          chatUUID,
          messageID,
          oldChatUUID,
          oldMessageID,
        )
      }
    >
      <View style={styles.innerContainer}>
        <View style={styles.accent} />
        <View style={styles.content}>
          <AppText
            style={styles.senderName}
            numberOfLines={1}
            text={senderName ?? "Unknown"}
          />
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
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 10,
      overflow: "hidden",
      minHeight: 45,
    },
    accent: {
      width: 3,
      backgroundColor: theme.icon,
    },
    content: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
      justifyContent: "center",
    },
    senderName: {
      fontWeight: "600",
      fontSize: 12,
      color: theme.icon,
      marginBottom: 2,
    },
    text: {
      fontSize: 12,
      color: theme.placeholderText,
      lineHeight: 16,
    },
  });

export default MessageReply;
