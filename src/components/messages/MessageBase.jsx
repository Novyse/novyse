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
import { getFileType } from "@/src/utils/storage/file/type";

import storage from "@/src/utils/storage/file";

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

  // object.groupby non è (ancora) supportata su react native quindi tocca fare così
  const groupBy = (array, callback) => {
    return array.reduce((acc, item) => {
      const key = callback(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const audioMessages = groupBy(
    files,
    ({ mimeType }) =>
      getFileType(mimeType) === "VOICE" || getFileType(mimeType) === "AUDIO"
  );

  const mediaMessages = groupBy(
    files,
    ({ mimeType }) =>
      getFileType(mimeType) === "IMAGE" || getFileType(mimeType) === "VIDEO"
  );

  const otherMessages = groupBy(files, ({ mimeType }) =>
    ["DOCUMENT", "CODE", "ARCHIVE", "OTHER"].includes(getFileType(mimeType))
  );

  const sharedContent = (
    <>
      <View style={styles.textContainer}>
        {/* images/videos print */}
        {/* <MessageImagesVideos mediaUris={mediaMessages[true]?.map((m) => m.uri) || []} />  MULTIPLE IMAGES IN ONE MESSAGE 2X2 */}
        {(mediaMessages.true || []).map((mediaMessage) => {
          return (
            <MessageImagesVideos
              mediaUris={[mediaMessage.uri]}
              uuid={mediaMessage.uuid}
              mimeType={mediaMessage.mimeType}
              size={mediaMessage.size}
            />
          );
        })}

        {/* others print */}
        {(otherMessages.true || []).map((otherMessage) => {
          return (
            <MessageOther
              fileUri={otherMessage.uri}
              uuid={otherMessage.uuid}
              mimeType={otherMessage.mimeType}
              size={otherMessage.size}
            />
          );
        })}

        {/* audios print */}
        {(audioMessages.true || []).map((audioMessage) => {
          return (
            <MessageAudio
              audioRef={audioMessage.ref}
              uuid={audioMessage.uuid}
              mimeType={audioMessage.mimeType}
              size={audioMessage.size}
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
