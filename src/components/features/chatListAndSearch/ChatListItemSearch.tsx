import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { useTranslation } from "react-i18next";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Avatar from "@/src/components/Avatar";

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

    return (
      <SmartBackground style={styles.chatItem}>
        <HoverAndPressedButton
          onPress={() => onPress(item.handle)}
          disabled={false}
          style={styles.chatItemPressable}
        >
          <Avatar uuid={item.profilePictureUUID}/>
          <View style={styles.textContainer}>
            <AppText
              style={styles.resultText}
              numberOfLines={1}
              ellipsizeMode="tail"
              text={`${item.name}${item?.surname ? ` ${item?.surname}` : ""}`}
            />
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
          </View>
        </HoverAndPressedButton>
      </SmartBackground>
    );
  },
);

function createStyle(theme: any) {
  return StyleSheet.create({
    chatItem: { borderRadius: 15, height: 65 },
    chatItemPressable: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      width: "100%",
      flex: 1,
      borderRadius: 150,
    },
    resultText: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
    },
    profileHandle: {
      fontSize: 14,
      color: theme.text,
    },
    textContainer: {
      flex: 1,
      marginLeft: 10,
    },
  });
}

export default ChatListItemSearch;
