import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import BlurredView from "@/src/components/BlurredView";
import messageUtils from "@/src/utils/chat/messageFormat";

const ReplyBar = ({ replyingTo, onCancelReply }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  if (!replyingTo) return null;

  const [content, setContent] = useState(null);
  useEffect(() => {
    if (replyingTo) {
      const message = messageUtils.format(replyingTo);
      setContent(message.content);
    }
  }, [replyingTo]);

  return (
    <BlurredView style={styles.actionContainer}>
      <Icon name="ArrowMoveUpLeftIcon" size={16} color={theme.icon} />
      <View style={styles.actionAccent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.actionName} numberOfLines={1}>
          {replyingTo.sender_name ?? replyingTo.senderUUID}
        </Text>
        <Text style={styles.actionText} numberOfLines={1}>
          {content}
        </Text>
      </View>
      <Icon
        name="Cancel01Icon"
        size={18}
        color={theme.placeholderText}
        onPress={onCancelReply}
      />
    </BlurredView>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    actionContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.backgroundCard,
      borderRadius: 18,
      marginBottom: 4,
      gap: 8,
    },
    actionAccent: {
      width: 3,
      borderRadius: 2,
      alignSelf: "stretch",
      backgroundColor: theme.icon,
    },
    actionName: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 13,
    },
    actionText: {
      color: theme.placeholderText,
      fontSize: 13,
    },
  });

export default ReplyBar;
