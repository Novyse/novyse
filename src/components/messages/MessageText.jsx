import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { EnrichedMarkdownText } from "react-native-enriched-markdown";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import Platform from "@/src/utils/device/type";
import { getMarkdownStyle } from "@/constants/markdownStyles";

const MessageText = ({
  message,
  onReply,
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

  // No trailing spacer chars — those were selectable/copyable and inflated short messages.
  // Space for the meta is handled by layout (float on web, flow on native).
  let normalized = preprocessedText;

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
                  } = require("@/src/store/ActiveChatStore");

                  // Deselect the message when an action is performed
                  useActiveChatStore.getState().setSelectedMessages([]);
                },
              },
            ],
          }
        : {})}
      selectionColor={theme.primary + "40"}
      style={styles.text}
      markdownStyle={getMarkdownStyle(theme)}
    />
  );

  // Allow text selection on web and desktop
  if (Platform === "web" || Platform === "desktop") {
    return (
      <View
        nativeID={`message-text-${message.id}`}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={[styles.textWebWrap, { userSelect: "text", cursor: "text" }]}
      >
        <style>{`
          #message-text-${message.id} ::selection {
            background-color: ${theme.primary}40 !important;
          }
          #message-text-${message.id},
          #message-text-${message.id} * {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            max-width: 100% !important;
          }
        `}</style>
        {markdownElement}
      </View>
    );
  }

  return markdownElement;
};

const createStyle = (theme) =>
  StyleSheet.create({
    text: {
      fontSize: 15,
      maxWidth: "100%",
      ...((Platform === "web" || Platform === "desktop") && {
        // Break long tokens (URLs, unbroken strings) instead of overflowing the bubble
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        whiteSpace: "pre-wrap",
        userSelect: "text",
      }),
    },
    textWebWrap: {
      maxWidth: "100%",
      minWidth: 0,
    },
  });

export default MessageText;
