import { View, Text, StyleSheet, Pressable } from "react-native";
import { useThemeContext } from "@/context/ThemeContext";
import useNavigation from "@/src/hooks/chat/useNavigation";

const MessageReply = ({
  senderName,
  text,
  chatUUID,
  messageID,
  oldChatUUID,
  oldMessageID,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);
  const { navigateToMessageWithHistory } = useNavigation();

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
          <Text style={styles.senderName} numberOfLines={1} selectable={false}>
            {senderName ?? "Unknown"}
          </Text>
          <Text style={styles.text} numberOfLines={2} selectable={false}>
            {text ?? ""}
          </Text>
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
