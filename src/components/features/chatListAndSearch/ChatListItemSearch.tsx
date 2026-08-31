import React from "react";
import { StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";

import Avatar from "@/src/components/ui/avatar/Avatar";
import BaseListItem from "./BaseListItem";

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
    const { t } = useTranslation();
    const styles = createStyle();

    const title = `${item.name}${item?.surname ? ` ${item?.surname}` : ""}`;

    const subtitleNode = (
      <Typography
        size="sm"
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
      <Avatar uuid={item.profilePictureUUID} style={styles.avatar} />
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

function createStyle() {
  return StyleSheet.create({
    avatar: {
      width: 45,
      height: 45,
      borderRadius: 25,
    },
  });
}

export default ChatListItemSearch;
