import React, { useContext } from "react";
import { Text, StyleSheet, Platform } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";

const urlRegex =
  /(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])(\S*)/g;

const mentionRegex = /@(\w+)/g;

const MessageText = ({ text }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const styles = createStyle(theme);

  if (!text) return null;

  const parts = [];
  let lastIndex = 0;

  const matches = [];
  let match;
  urlRegex.lastIndex = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({ type: "url", match, index: match.index });
  }
  mentionRegex.lastIndex = 0;
  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({ type: "mention", match, index: match.index });
  }

  matches.sort((a, b) => a.index - b.index);

  for (const item of matches) {
    const { type, match, index } = item;
    if (index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={styles.MessageTextContent}>
          {text.substring(lastIndex, index)}
        </Text>,
      );
    }
    if (type === "url") {
      const linkUrl = match[0].startsWith("http")
        ? match[0]
        : `https://${match[0]}`;
      parts.push(
        <Text
          key={`l-${index}`}
          style={styles.messagesLink}
          onPress={() =>
            Platform.OS === "web"
              ? window.open(linkUrl, "_blank")
              : Linking.openURL(linkUrl)
          }
        >
          {match[0]}
        </Text>,
      );
    } else if (type === "mention") {
      const username = match[1];
      const profileUrl = `/profile/${username.toLowerCase()}`;
      parts.push(
        <Text
          key={`m-${index}`}
          style={styles.messagesLink}
          onPress={() => router.push(profileUrl)}
        >
          {match[0]}
        </Text>,
      );
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-last`} style={styles.MessageTextContent}>
        {text.substring(lastIndex)}
      </Text>,
    );
  }

  return parts.length > 0 ? (
    <Text>{parts}</Text>
  ) : (
    <Text style={styles.MessageTextContent}>{text}</Text>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    MessageTextContent: {
      color: theme.text,
      fontSize: 15,
      textAlign: "left",
      maxWidth: "100%",
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
    messagesLink: {
      fontSize: 15,
      color: theme.messagesLink,
      textDecorationLine: "underline",
      ...(Platform.OS === "web" && {
        wordBreak: "break-all",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
  });

export default MessageText;
