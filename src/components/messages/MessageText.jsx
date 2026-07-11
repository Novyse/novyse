import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import Platform from "@/src/utils/device/type";

const MessageText = ({
  message,
  onReply,
  timestampWidth = 80,
  isSelected = false,
  highlightedRange,
  onTaskListItemPress,
}) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const styles = createStyle(theme);

  if (!message.content?.trim()) return null;

  // Process username mentions as links
  let preprocessedText = message.content
    .trimStart()
    .replace(/(^|\s)@(\w+)/g, "$1[@$2](/profile/$2)");

  let normalized =
    preprocessedText + `  ${"\u00A0".repeat(Math.ceil(timestampWidth / 4))}`;

  if (
    highlightedRange &&
    highlightedRange.rangeStart != null &&
    highlightedRange.rangeEnd != null
  ) {
    const { rangeStart, rangeEnd } = highlightedRange;
    if (
      rangeStart >= 0 &&
      rangeEnd <= normalized.length &&
      rangeStart < rangeEnd
    ) {
      normalized =
        normalized.slice(0, rangeStart) +
        "==" +
        normalized.slice(rangeStart, rangeEnd) +
        "==" +
        normalized.slice(rangeEnd);
    }
  }

  const markdownElement = (
    <EnrichedMarkdownText
      flavor="github"
      md4cFlags={{ highlight: true }}
      selectable={
        Platform === "web" || Platform === "desktop" ? true : isSelected
      }
      markdown={normalized}
      onTaskListItemPress={onTaskListItemPress}
      onLinkPress={({ url }) => {
        if (url.startsWith("/profile/")) {
          const username = url.replace("/profile/", "");
          router.push(`/profile/${username.toLowerCase()}`);
        } else if (Platform === "web" || Platform === "desktop") {
          window.open(url, "_blank");
        } else {
          Linking.openURL(url);
        }
      }}
      {...(Platform !== "web" && Platform !== "desktop"
        ? {
            selectionMenuConfig: {
              copyAsMarkdown: { enabled: false },
            },
            contextMenuItems: [
              {
                text: "Quote",
                onPress: (event) => {
                  if (onReply) {
                    onReply(
                      message,
                      event.selection?.start,
                      event.selection?.end,
                    );
                  }
                  const {
                    useActiveChatStore,
                  } = require("@/src/context/ActiveChatContext");

                  // Deselect the message when an action is performed
                  useActiveChatStore.getState().setSelectedMessages([]);
                },
              },
            ],
          }
        : {})}
      selectionColor={theme.primary + "40"}
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
        highlight: { backgroundColor: theme.primary + "60", color: theme.text },
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

  // Allow text selection on web and desktop
  if (Platform === "web" || Platform === "desktop") {
    return (
      <View
        nativeID={`message-text-${message.id}`}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{ userSelect: "text", cursor: "text" }}
      >
        <style>{`
          #message-text-${message.id} ::selection {
            background-color: ${theme.primary}40 !important;
          }
        `}</style>
        <View>{markdownElement}</View>
      </View>
    );
  }

  return markdownElement;
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
