import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";

const MessageReply = ({ senderName, text }) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>
          {senderName ?? "Unknown"}
        </Text>
        <Text style={styles.text} numberOfLines={2}>
          {text ?? ""}
        </Text>
      </View>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 10,
      marginBottom: 6,
      overflow: "hidden",
      minHeight: 42,
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
