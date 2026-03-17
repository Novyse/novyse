import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";
import BlurredView from "@/src/components/BlurredView";
import messageUtils from "@/src/utils/chat/messageFormat";

interface Message {
  id: string | number;
  sender_name?: string;
  senderUUID?: string;
  [key: string]: any; 
}

interface ReplyItemProps {
  message: Message;
  onCancel: (id: string | number) => void;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ message, onCancel }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const formatted = messageUtils.format(message);
      setContent(formatted.content);
    }
  }, [message]);

  return (
    <View style={styles.actionContainer}>
      <Icon name="ArrowMoveUpLeftIcon" size={18} color={theme.icon} />
      <View style={styles.actionAccent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.actionName} numberOfLines={1}>
          {message.sender_name ?? message.senderUUID}
        </Text>
        <Text style={styles.actionText} numberOfLines={1}>
          {content}
        </Text>
      </View>
      <Icon
        name="Cancel01Icon"
        size={18}
        color={theme.placeholderText}
        onPress={() => onCancel(message.id)}
      />
    </View>
  );
};

interface ReplyBarProps {
  replyingTo: Message[] | null;
  onCancelReply: (id: string | number) => void;
}

const ReplyBar: React.FC<ReplyBarProps> = ({ replyingTo, onCancelReply }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!replyingTo || replyingTo.length === 0) return null;

  return (
    <BlurredView style={styles.listContainer}>
      {replyingTo.map((msg) => (
        <ReplyItem
          key={"reply-" + msg.id}
          message={msg}
          onCancel={onCancelReply}
        />
      ))}
    </BlurredView>
  );
};

interface Styles {
  listContainer: ViewStyle;
  actionContainer: ViewStyle;
  actionAccent: ViewStyle;
  actionName: TextStyle;
  actionText: TextStyle;
}

const createStyle = (theme: any): Styles =>
  StyleSheet.create({
    listContainer: {
      borderRadius: 20,
      marginBottom: 5,
      overflow: "hidden",
      paddingVertical: 10,
      gap: 10,
    },
    actionContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      gap: 10,
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