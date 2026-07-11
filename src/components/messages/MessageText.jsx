import React, { useContext } from "react";
import { StyleSheet, Platform } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";

const MessageText = ({ text, timestampWidth = 80, onTaskListItemPress }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const styles = createStyle(theme);

  if (!text?.trim()) return null;

  // Process username mentions as links
  let preprocessedText = text
    .trimStart()
    .replace(/(^|\s)@(\w+)/g, "$1[@$2](/profile/$2)");

  const normalized =
    preprocessedText + `  ${"\u00A0".repeat(Math.ceil(timestampWidth / 4))}`;

  return (
    <EnrichedMarkdownText
      flavor="github"
      selectable={true}
      markdown={normalized}
      onTaskListItemPress={onTaskListItemPress}
      onLinkPress={({ url }) => {
        if (url.startsWith("/profile/")) {
          const username = url.replace("/profile/", "");
          router.push(`/profile/${username.toLowerCase()}`);
        } else if (Platform.OS === "web") {
          window.open(url, "_blank");
        } else {
          Linking.openURL(url);
        }
      }}
      style={styles.text}
      markdownStyle={{
        paragraph: { color: theme.text },
        h1: { color: theme.text },
        h2: { color: theme.text },
        h3: { color: theme.text },
        h4: { color: theme.text },
        h5: { color: theme.text },
        h6: { color: theme.text },
        list: { color: theme.text },
        listItem: { color: theme.text },
        link: { color: theme.textLink, underline: true },
        strong: { fontWeight: "bold" },
        em: { fontStyle: "italic" },
        table: {
          color: theme.text,
          headerBackgroundColor: theme.iconHovered,
          headerTextColor: theme.text,
          rowEvenBackgroundColor: "transparent",
          rowOddBackgroundColor: theme.iconHovered,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 8,
          cellPaddingHorizontal: 10,
          cellPaddingVertical: 8,
        },
        taskList: {
          checkedColor: theme.primary,
          borderColor: theme.borderColor,
          checkboxSize: 18,
          checkboxBorderRadius: 6,
          checkmarkColor: theme.backgroundCard,
          checkedTextColor: theme.placeholderText,
          checkedStrikethrough: true,
        },
      }}
    />
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    text: {
      fontSize: 15,
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
        userSelect: "text",
      }),
    },
  });

export default MessageText;
