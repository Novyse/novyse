// components/messages/TextMessage.js
import React, { useContext } from "react";
import { Text, StyleSheet, Platform } from "react-native";
import * as Linking from "expo-linking";
import { ThemeContext } from "@/context/ThemeContext";

const urlRegex = /(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])(\S*)/g;

const TextMessage = ({ text }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!text) return null;

  const parts = [];
  let lastIndex = 0;
  let match;
  urlRegex.lastIndex = 0; // Reset regex state

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`t-${lastIndex}`} style={styles.textMessageContent}>
          {text.substring(lastIndex, match.index)}
        </Text>
      );
    }
    const linkUrl = match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
    parts.push(
      <Text
        key={`l-${match.index}`}
        style={styles.messagesLink}
        onPress={() => Platform.OS === "web" ? window.open(linkUrl, "_blank") : Linking.openURL(linkUrl)}
      >
        {match[0]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`t-last`} style={styles.textMessageContent}>
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return parts.length > 0 ? (
    <Text>{parts}</Text>
  ) : (
    <Text style={styles.textMessageContent}>{text}</Text>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    textMessageContent: {
      color: theme.text,
      fontSize: 18,
      maxWidth: "100%",
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
    messagesLink: {
      fontSize: 18,
      color: theme.messagesLink,
      textDecorationLine: "underline",
      ...(Platform.OS === "web" && {
        wordBreak: "break-all",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
  });

export default TextMessage;