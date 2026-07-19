import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

import Icon from "@/src/components/Icon";
import Avatar from "@/src/components/Avatar";
import BaseListItem from "./BaseListItem";

import useUserStore from "@/src/context/UserContext";
import { useChatMetadata } from "@/src/hooks/chat/useChatMetadata";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import messageUtils from "@/src/utils/chat/messageFormat";

const ChatListItem = React.memo(
  ({
    item,
    isSelected,
    isActive,
    isPinned,
    unreadCount = 0,
    isSidebarCollapsed = false,
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
          text={`${sender}${content}`}
        />
      );
    };

    const dateNode = lastMessage ? (
      <>
        {!lastMessage.created_at ? (
          <Icon name={"Clock01Icon"} size={14} />
        ) : (
          <AppText
            style={styles.chatDateText}
            text={parseTime(lastMessage.created_at)}
          />
        )}
      </>
    ) : null;

    const subtitleNode =
      memberActivityData && memberActivityData.length > 0 ? (
        <AppText
          style={styles.chatSubtitle}
          text={messageUtils.formatActivity(memberActivityData)}
        />
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
      );

    const renderAvatar = () => (
      <Avatar
        uuid={displayPfp}
        theme={theme}
        style={[styles.avatar, isSidebarCollapsed && { marginRight: 0 }]}
        isOnline={chatType === "DM" ? onlineMembersCount === 2 : false}
      />
    );

    return (
      <BaseListItem
        id={item.uuid}
        title={displayName}
        subtitleNode={subtitleNode}
        dateNode={dateNode}
        unreadCount={unreadCount}
        isSidebarCollapsed={isSidebarCollapsed}
        isSelected={isSelected}
        isActive={isActive}
        isPinned={isPinned}
        onPress={onPress}
        onLongPress={onLongPress}
        renderAvatar={renderAvatar}
      />
    );
  },
);

function createStyle(theme) {
  return StyleSheet.create({
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 20,
    },
    chatSubtitle: {
      fontSize: 14,
      color: theme.text,
    },
    gridText: {
      fontSize: 14,
      color: theme.text,
    },
    chatDateText: {
      fontSize: 14,
      color: theme.text,
      textAlign: "right",
      marginLeft: 5,
    },
  });
}

export default ChatListItem;
