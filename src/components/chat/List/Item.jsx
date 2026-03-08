import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { DateTime } from "luxon";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import Avatar from "@/src/components/Avatar";

import useUserStore from "@/context/UserContext";
import { ThemeContext } from "@/context/ThemeContext";

const ChatListItem = React.memo(
  ({
    item,
    isSelected,
    isActive,
    isPinned,
    unreadCount = 0,
    onPress,
    onLongPress,
  }) => {
    const { theme } = useContext(ThemeContext);
    const styles = createStyle(theme);

    const localUserUUID = useUserStore((state) => state.localUserUUID);

    // Determine the UUID of the user to display for DMs
    const targetUUID =
      item.type === "DM" && item.members
        ? item.members.length === 1
          ? localUserUUID // Self-chat
          : item.members.find((m) => m.uuid !== localUserUUID)?.uuid
        : null;

    // Reactive subscription to the target user object
    const targetUser = useUserStore((state) =>
      targetUUID ? state.users[targetUUID] : null,
    );

    // Resolve display name & pfp
    const dmInfo = (() => {
      if (item.type !== "DM" || !targetUser) return null;

      if (item.members?.length === 1) {
        return {
          name: "Saved Messages",
          pfp: targetUser.profilePictureUUID,
        };
      }

      return {
        name: targetUser.name,
        pfp: targetUser.profilePictureUUID,
      };
    })();

    const displayName = dmInfo?.name ?? item.name ?? "";
    const displayPfp = dmInfo?.pfp ?? item.profilePictureUUID ?? null;

    const parseTime = (dateTimeMessage) => {
      if (!dateTimeMessage) return "";
      return DateTime.fromJSDate(new Date(dateTimeMessage)).toFormat("HH:mm");
    };

    const lastMessage =
      item.messages?.length > 0
        ? item.messages[item.messages.length - 1]
        : item.lastMessage || null;

    const displayMessage = (message) => {
      if (!message) return null;
      let content = message.content;
      let sender = "";
      if (message.senderUUID === localUserUUID) {
        sender = "You: ";
      } else if (message.senderUUID && message.sender_name) {
        sender = `${message.sender_name}: `;
      } else if (message.type === "system") {
        sender = "";
      } else {
        sender = "Unknown: ";
      }
      return (
        <Text
          style={[styles.chatSubtitle, styles.gridText]}
          numberOfLines={1}
          ellipsizeMode="tail"
          selectable={false}
        >
          {sender}
          {content}
        </Text>
      );
    };

    return (
      <SmartBackground
        colors={
          isSelected || isActive
            ? theme?.backgroundChatListItemSelectedGradient
            : "transparent"
        }
        style={styles.chatItem}
      >
        <HoverAndPressedButton
          onPress={() => onPress(item.uuid)}
          onLongPress={() => onLongPress(item.uuid)}
          style={styles.chatItemPressable}
        >
          {isSelected && (
            <View style={styles.selectionIndicator}>
              <Icon name={"Tick02Icon"} size={24} />
            </View>
          )}
          <Avatar uuid={displayPfp} theme={theme} style={styles.avatar} />
          <View style={styles.chatItemGrid}>
            <View style={styles.leftContainer}>
              <Text
                style={[styles.chatTitle, styles.gridText, { marginBottom: 5 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                selectable={false}
              >
                {displayName}
              </Text>
              {displayMessage(lastMessage)}
            </View>
            <View style={styles.rightContainer}>
              <View style={styles.dateContainer}>
                {lastMessage && (
                  <>
                    {!lastMessage.created_at ? (
                      <Icon name={"Clock01Icon"} size={14} />
                    ) : (
                      <>
                        <Icon name={"TickDouble02Icon"} size={18} />
                        <Text style={styles.chatDateText} selectable={false}>
                          {parseTime(lastMessage.created_at)}
                        </Text>
                      </>
                    )}
                  </>
                )}
              </View>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                {isPinned && <Icon name={"PinIcon"} size={16} />}
                {unreadCount > 0 && (
                  <View style={[styles.ball]}>
                    <Text style={[styles.ballText]} selectable={false}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  },
);

function createStyle(theme) {
  return StyleSheet.create({
    chatItem: { borderRadius: 15, height: 65 },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 15,
      gap: 10,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    chatTitle: { fontSize: 16, fontWeight: "bold", color: theme.text },
    chatSubtitle: { fontSize: 14, color: theme.text },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    leftContainer: { flex: 1, flexDirection: "column" },
    rightContainer: { flexDirection: "column", alignItems: "flex-end" },
    gridText: { fontSize: 14, color: theme.text },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    ballText: { textAlign: "center", color: theme.text, fontSize: 12 },
    dateContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 5,
    },
    chatDateText: {
      fontSize: 14,
      color: theme.text,
      textAlign: "right",
      marginLeft: 5,
    },
    selectionIndicator: {
      position: "absolute",
      top: 5,
      left: 5,
      zIndex: 1,
      backgroundColor: "#25b34bff",
      borderRadius: 999,
    },
  });
}

export default ChatListItem;
