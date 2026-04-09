import React, { useContext } from "react";
import { StyleSheet, Platform } from "react-native";
import AppText from "@/src/components/AppText";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";

const URL_REGEX =
  /(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])(\S*)/g;
const MENTION_REGEX = /@(\w+)/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

const MessageText = ({ text, timestampWidth = 80 }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const styles = createStyle(theme);

  if (!text?.trim()) return null;

  const normalized = text.trimStart();

  const spacer = (
    <AppText
      key="spacer"
      style={{ opacity: 0, fontSize: 12 }}
      text={`  ${"\u00A0".repeat(Math.ceil(timestampWidth / 4))}`}
    />
  );

  const segments = parseSegments(normalized);

  const parts = segments.map(({ type, value, url, username }, i) => {
    if (type === "url") {
      return (
        <AppText
          key={i}
          style={styles.link}
          onPress={() =>
            Platform.OS === "web"
              ? window.open(url, "_blank")
              : Linking.openURL(url)
          }
          text={value}
        />
      );
    }
    if (type === "mention") {
      return (
        <AppText
          key={i}
          style={styles.link}
          onPress={() => router.push(`/profile/${username.toLowerCase()}`)}
          text={value}
        />
      );
    }
    if (type === "email") {
      return (
        <AppText
          key={i}
          style={styles.link}
          onPress={() => Linking.openURL(`mailto:${value}`)}
          text={value}
        />
      );
    }
    return <AppText key={i} style={styles.text} text={value} />;
  });

  return (
    <AppText style={styles.text}>
      {parts}
      {spacer}
    </AppText>
  );
};

// Estrae i segmenti url/mention/plain dal testo
function parseSegments(text) {
  const matches = [];
  let m;

  URL_REGEX.lastIndex = 0;
  while ((m = URL_REGEX.exec(text)) !== null)
    matches.push({
      type: "url",
      index: m.index,
      length: m[0].length,
      raw: m[0],
    });

  MENTION_REGEX.lastIndex = 0;
  while ((m = MENTION_REGEX.exec(text)) !== null)
    matches.push({
      type: "mention",
      index: m.index,
      length: m[0].length,
      raw: m[0],
    });

  EMAIL_REGEX.lastIndex = 0;
  while ((m = EMAIL_REGEX.exec(text)) !== null)
    matches.push({
      type: "email",
      index: m.index,
      length: m[0].length,
      raw: m[0],
    });

  matches.sort((a, b) => a.index - b.index);

  const segments = [];
  let cursor = 0;

  for (const { type, index, length, raw } of matches) {
    if (index < cursor) continue; // Skip overlapping matches

    if (index > cursor)
      segments.push({ type: "plain", value: text.slice(cursor, index) });

    if (type === "url") {
      segments.push({
        type: "url",
        value: raw,
        url: raw.startsWith("http") ? raw : `https://${raw}`,
      });
    } else if (type === "mention") {
      segments.push({ type: "mention", value: raw, username: raw.slice(1) });
    } else {
      segments.push({ type: "email", value: raw });
    }
    cursor = index + length;
  }

  if (cursor < text.length)
    segments.push({ type: "plain", value: text.slice(cursor) });

  return segments;
}

const createStyle = (theme) =>
  StyleSheet.create({
    text: {
      color: theme.text,
      fontSize: 15,
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "pre-wrap",
      }),
    },
    link: {
      color: theme.messagesLink,
      fontSize: 15,
      textDecorationLine: "underline",
    },
  });

export default MessageText;
