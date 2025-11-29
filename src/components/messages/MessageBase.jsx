import React, { useContext } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  Text,
  Image,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import SmartBackground from "../SmartBackground";
import { getFileType } from "@/src/utils/file/type";
import { getMimeType } from "@/src/utils/file/index.js";

import MessageText from "./MessageText";
import MessageTimestamp from "./MessageTimestamp";
import MessageAudio from "./MessageAudio";
import MessageImagesVideos from "./MessageImagesVideos";
import MessageOther from "./MessageOther";

const MessageBase = ({ message, isSender, onLongPress }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    content,
    created_at,
    showSenderName = false,
    showAvatar = false,
    sender_name,
    type,
    files = [],
  } = message;

  const audioMessages =
    Object.groupBy(
      files,
      async ({ uri }) =>
        getFileType(await getMimeType(uri)) == "VOICE" ||
        getFileType(await getMimeType(uri)) == "AUDIO"
    ) || [];
  const mediaMessages =
    Object.groupBy(
      files,
      async ({ uri }) =>
        getFileType(await getMimeType(uri)) == "IMAGE" ||
        getFileType(await getMimeType(uri)) == "VIDEO"
    ) || [];
  const otherMessages =
    Object.groupBy(
      files,
      async ({ uri }) =>
        getFileType(await getMimeType(uri)) == "DOCUMENT" ||
        getFileType(await getMimeType(uri)) == "CODE" ||
        getFileType(await getMimeType(uri)) == "ARCHIVE" ||
        getFileType(await getMimeType(uri)) == "OTHER"
    ) || [];

  const sharedContent = (
    <>
      <View style={styles.textContainer}>
        {/* images/videos print */}
        {/* <MessageImagesVideos mediaUris={mediaMessages[true]?.map((m) => m.uri) || []} />  MULTIPLE IMAGES IN ONE MESSAGE 2X2 */}
        {(mediaMessages[true] || []).map((mediaMessage) => {
          return (
            <MessageImagesVideos
              mediaUris={[mediaMessage.uri]}
              s3Url={mediaMessage.uploadURL}
              uuid={mediaMessage.uuid}
            />
          );
        })}

        {/* others print */}
        {(otherMessages[true] || []).map((otherMessage) => {
          return (
            <MessageOther
              fileUri={otherMessage.uri}
              s3Url={otherMessage.uploadURL}
              uuid={otherMessage.uuid}
            />
          );
        })}

        {/* audios print */}
        {(audioMessages[true] || []).map((audioMessage) => {
          return (
            <MessageAudio
              audioUri={audioMessage.uri}
              s3Url={audioMessage.uploadURL}
              uuid={audioMessage.uuid}
            />
          );
        })}

        {/* Renderizza il testo SOLO se esiste ed è diverso da stringa vuota */}
        {content && content.trim().length > 0 && <MessageText text={content} />}

        <MessageTimestamp time={created_at} />
      </View>
    </>
  );

  if (isSender) {
    return (
      <SmartBackground
        colors={theme.backgroundMessageBaseGradient}
        style={[styles.senderBubble, showAvatar && styles.senderBubbleChained]}
      >
        <Pressable onLongPress={onLongPress} style={styles.pressable}>
          {sharedContent}
        </Pressable>
      </SmartBackground>
    );
  }

  // ... (Parte Receiver invariata per brevità, usa lo stesso sharedContent)
  return (
    <View style={styles.receiverContainer}>
      <View style={styles.receiverRow}>
        {showAvatar && (
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: "https://picsum.photos/200/300" }}
              style={styles.avatar}
            />
          </View>
        )}
        <SmartBackground
          colors={theme.backgroundMessageBaseGradient}
          style={[
            styles.receiverBubble,
            showAvatar && styles.receiverBubbleWithAvatar,
          ]}
        >
          <Pressable onLongPress={onLongPress} style={styles.pressable}>
            {showSenderName && (
              <View style={styles.senderNameWrapper}>
                <Text style={styles.senderName} numberOfLines={1}>
                  {sender_name}
                </Text>
              </View>
            )}
            {sharedContent}
          </Pressable>
        </SmartBackground>
      </View>
    </View>
  );
};

// ... stili invariati
const createStyle = (theme) =>
  StyleSheet.create({
    receiverContainer: { alignSelf: "flex-start", maxWidth: "80%" },
    receiverRow: { flexDirection: "row", alignItems: "flex-end" },
    senderBubble: {
      overflow: "hidden",
      marginVertical: 2,
      marginRight: 8,
      maxWidth: "80%",
      borderRadius: 10,
      alignSelf: "flex-end",
    },
    senderBubbleChained: { borderBottomRightRadius: 0 },
    receiverBubble: {
      overflow: "hidden",
      marginVertical: 2,
      marginLeft: 58,
      maxWidth: "80%",
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    receiverBubbleWithAvatar: { marginLeft: 10, borderBottomLeftRadius: 0 },
    pressable: { padding: 0, width: "100%" },
    textContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    avatarWrapper: { marginRight: 5, marginBottom: 5 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    senderNameWrapper: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
    },
    senderName: {
      fontWeight: "600",
      color: theme.primary || theme.text,
      flexShrink: 1,
    },
  });

export default MessageBase;
