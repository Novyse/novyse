import React, { useContext } from "react";
import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";

import useUserStore from "@/src/store/UserStore";
import { ThemeContext } from "@/src/context/ThemeContext";

import messageUtils from "@/src/utils/chat/messageFormat";

import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/layout/BlurredView";

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

  const senderUUID = message.senderUUID || "";
  const senderName =
    useUserStore((state) => state.users[senderUUID])?.name || "";

  const hasRange = message.rangeStart != null && message.rangeEnd != null;

  const content = message
    ? hasRange
      ? messageUtils
          .format(message)
          .content.slice(message.rangeStart, message.rangeEnd)
      : messageUtils.format(message).content
    : null;

  const iconName = hasRange ? "QuoteIcon" : "ArrowMoveUpLeftIcon";

  return (
    <View style={styles.actionContainer}>
      <Icon name={iconName} size={18} />
      <View style={styles.actionAccent} />
      <View style={{ flex: 1 }}>
        <Typography
          size="sm"
          weight="semibold"
          numberOfLines={1}
          text={senderName}
        />
        <Typography
          size="sm"
          variant="subtitle"
          numberOfLines={1}
          text={content}
        />
      </View>
      <Icon
        name="Cancel01Icon"
        size={18}
        color={theme.subtitle}
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
          key={"reply-" + msg.id + msg.rangeStart + msg.rangeEnd}
          message={msg}
          onCancel={onCancelReply}
        />
      ))}
    </BlurredView>
  );
};



const createStyle = (theme: any) =>
  StyleSheet.create({
    listContainer: {
      borderRadius: 25,
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
  });

export default ReplyBar;
