import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { useTranslation } from "react-i18next";

import Avatar from "@/src/components/Avatar";
import BaseListItem from "./BaseListItem";

import { ThemeContext } from "@/src/context/ThemeContext";

interface ChatListItemSearchProps {
  item: {
    name: string;
    surname?: string;
    handle: string;
    profilePictureUUID: string;
    type: "USER" | "GROUP" | "FORUM" | "CHANNEL" | "DM";
    memberCount?: number;
  };
  onPress: (handle: string) => void;
}

const ChatListItemSearch = React.memo(
  ({ item, onPress }: ChatListItemSearchProps) => {
    const { theme } = useContext(ThemeContext);
    const { t } = useTranslation();
    const styles = createStyle(theme);

    const title = `${item.name}${item?.surname ? ` ${item?.surname}` : ""}`;

    const subtitleNode = (
      <AppText
        style={styles.profileHandle}
        numberOfLines={1}
        ellipsizeMode="tail"
        text={[
          item?.handle ? `@${item.handle}` : "",
          item.type === "GROUP" ||
          item.type === "FORUM" ||
          item.type === "CHANNEL"
            ? t("chat.memberCount", { count: item.memberCount })
            : "",
        ]
          .filter(Boolean)
          .join(" • ")}
      />
    );

    const renderAvatar = () => (
      <Avatar
        uuid={item.profilePictureUUID}
        style={styles.avatar}
      />
    );

    return (
      <BaseListItem
        id={item.handle}
        title={title}
        subtitleNode={subtitleNode}
        renderAvatar={renderAvatar}
        onPress={onPress}
      />
    );
  },
);

function createStyle(theme: any) {
  return StyleSheet.create({
    profileHandle: {
      fontSize: 14,
      color: theme.text,
    },
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 20,
    },
  });
}

export default ChatListItemSearch;
