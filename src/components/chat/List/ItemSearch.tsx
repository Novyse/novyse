import React, { useContext } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

import SmartBackground from "@/src/components/SmartBackground";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

import { ThemeContext } from "@/context/ThemeContext";

interface ChatListItemSearchProps {
  item: {
    name: string;
    surname?: string;
    handle: string;
    type: "USER" | "GROUP" | "FORUM" | "CHANNEL";
    memberCount?: number;
  };
  onPress: (handle: string) => void;
}

const ChatListItemSearch = React.memo(
  ({ item, onPress }: ChatListItemSearchProps) => {
    const { theme } = useContext(ThemeContext);
    const styles = createStyle(theme);

    return (
      <SmartBackground
        style={styles.chatItem}
      >
        <HoverAndPressedButton
          onPress={() => onPress(item.handle)}
          disabled={false}
          style={styles.chatItemPressable}
        >
          <Image
            source={{ uri: "https://picsum.photos/200" }}
            style={styles.avatar}
          />
          <View style={styles.textContainer}>
            <Text
              style={styles.resultText}
              numberOfLines={1}
              ellipsizeMode="tail"
              selectable={false}
            >
              {item.name} {item?.surname ? `${item?.surname}` : null}
            </Text>
            <Text
              style={styles.profileHandle}
              numberOfLines={1}
              ellipsizeMode="tail"
              selectable={false}
            >
              {item?.handle ? `@${item.handle}` : ""}
              {item.type === "GROUP" ||
              item.type === "FORUM" ||
              item.type === "CHANNEL"
                ? ` • ${item.memberCount} ${item.memberCount === 1 ? "member" : "members"}`
                : ""}
            </Text>
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
      borderRadius: 150,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
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
