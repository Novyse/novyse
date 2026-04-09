import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import Avatar from "@/src/components/Avatar";

import useUserStore from "@/context/UserContext";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import { ThemeContext } from "@/context/ThemeContext";
import { useActiveChatStore } from "@/context/ActiveChatContext";

import messageUtils from "@/src/utils/chat/messageFormat";

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
    const { t } = useTranslation();
    const { theme } = useContext(ThemeContext);
    const styles = React.useMemo(() => createStyle(theme), [theme]);
    const localUserUUID = useUserStore((state) => state.localUserUUID);
    const {
      name: displayName,
      profilePictureUUID: displayPfp,
      type: chatType,
      onlineMembersCount,
      memberActivityData,
    } = useChatMetadata(item);

    const draftText = useActiveChatStore(
      (state) => state.chatUIStates[item.uuid || item.handle]?.newMessageText,
    );
    const draftFiles = useActiveChatStore(
      (state) => state.chatUIStates[item.uuid || item.handle]?.files,
    );

    const parseTime = (dateTimeMessage) => {
      if (!dateTimeMessage) return "";
      return DateTime.fromISO(dateTimeMessage, { zone: "utc" })
        .toLocal()
        .toFormat("HH:mm");
    };

    const lastMessage =
      item.messages?.length > 0
        ? item.messages[item.messages.length - 1]
        : item.lastMessage || null;

    const relevantUUID =
      lastMessage?.type === "system"
        ? lastMessage?.content
        : lastMessage?.senderUUID;
    const relevantUser = useUserStore((state) => state.users[relevantUUID]);

    const displayMessage = (message) => {
      if (!message) return null;

      const formattedMessage = messageUtils.format(message);
      const content = formattedMessage.content;

      let sender = "";
      const isDraft = message.type === "DRAFT";

      if (isDraft) {
        sender = `${t("chat.listItem.draft")}: `;
      } else if (message.type === "system") {
        sender = "";
      } else if (message.senderUUID === localUserUUID) {
        sender = `${t("chat.listItem.you")}: `;
      } else if (message.senderUUID) {
        sender = `${relevantUser?.name || t("chat.listItem.unknown")}: `;
      } else {
        sender = `${t("chat.listItem.unknown")}: `;
      }
      return (
        <AppText
          style={[
            styles.chatSubtitle,
            styles.gridText,
            isDraft && { color: theme.error },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
          selectable={false}
          text={`${sender}${content}`}
        />
      );
    };

    return (
      <View style={styles.chatItem}>
        <SmartBackground
          colors={
            isSelected || isActive
              ? theme?.backgroundChatListItemSelectedGradient
              : "transparent"
          }
          style={[StyleSheet.absoluteFill, { borderRadius: 100 }]}
        />
        <HoverAndPressedButton
          onPress={() => onPress(item.uuid)}
          onLongPress={() => onLongPress(item.uuid)}
          style={styles.chatItemPressable}
        >
          {isSelected && (
            <View style={styles.selectionIndicator}>
              <Icon name={"Tick02Icon"} />
            </View>
          )}
          <Avatar
            uuid={displayPfp}
            theme={theme}
            style={styles.avatar}
            isOnline={chatType === "DM" ? onlineMembersCount === 2 : false}
          />
          <View style={styles.chatItemGrid}>
            {/* LEFT */}
            <View style={styles.leftContainer}>
              <View style={styles.titleRow}>
                <AppText
                  style={[styles.chatTitle, styles.gridText]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  selectable={false}
                  text={displayName}
                />
              </View>
              <View style={styles.subtitleRow}>
                {memberActivityData && memberActivityData.length > 0 ? (
                  <AppText style={styles.chatSubtitle} selectable={false} text={messageUtils.formatActivity(memberActivityData)} />
                ) : (
                  displayMessage(
                    draftText || draftFiles?.length > 0
                      ? {
                          type: "DRAFT",
                          content: draftText || "",
                          files: draftFiles,
                        }
                      : lastMessage,
                  )
                )}
              </View>
            </View>

            {/* RIGHT */}
            <View style={styles.rightContainer}>
              <View style={styles.dateRow}>
                {lastMessage && (
                  <>
                    {!lastMessage.created_at ? (
                      <Icon name={"Clock01Icon"} size={14} />
                    ) : (
                      <>
                        <Icon name={"TickDouble02Icon"} size={18} />
                        <AppText style={styles.chatDateText} selectable={false} text={parseTime(lastMessage.created_at)} />
                      </>
                    )}
                  </>
                )}
              </View>

              <View style={styles.badgeRow}>
                {isPinned && <Icon name={"PinIcon"} size={16} />}
                {unreadCount > 0 && (
                  <View style={styles.ball}>
                    <AppText style={styles.ballText} selectable={false} text={unreadCount} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </HoverAndPressedButton>
      </View>
    );
  },
);

function createStyle(theme) {
  return StyleSheet.create({
    chatItem: {
      borderRadius: 100,
      height: 60,
    },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 10,
      paddingRight: 15,
      width: "100%",
      flex: 1,
      borderRadius: 100,
      gap: 10,
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 20,
      marginRight: 10,
    },
    chatTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
    },
    chatSubtitle: {
      fontSize: 14,
      color: theme.text,
    },
    chatItemGrid: {
      flexDirection: "row",
      flex: 1,
      justifyContent: "space-between",
    },
    gridText: {
      fontSize: 14,
      color: theme.text,
    },
    ball: {
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.badgeColor,
    },
    ballText: {
      textAlign: "center",
      color: theme.text,
      fontSize: 12,
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
    leftContainer: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
    },
    titleRow: {
      height: 22,
      justifyContent: "center",
    },
    subtitleRow: {
      height: 20,
      justifyContent: "center",
    },
    rightContainer: {
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "center",
    },
    dateRow: {
      height: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 3,
    },
    badgeRow: {
      height: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 5,
    },
  });
}

export default ChatListItem;
