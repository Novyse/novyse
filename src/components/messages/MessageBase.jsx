import React, { useContext } from "react";
import { View, Pressable, StyleSheet, Text, Image } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "../BlurredView";
import { getFileType } from "@/src/utils/storage/file/type";

import MessageTimestamp from "./MessageTimestamp";

import MessageMedia from "./MessageMedia";
import MessageOther from "./MessageOther";
import MessageAudio from "./MessageAudio";
import MessageVoice from "./MessageVoice";

import MessageText from "./MessageText";

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

  const voiceMessages = groupBy(
    files,
    ({ mimeType, name }) => getFileType(mimeType, name) === "VOICE"
  );

  const audioMessages = groupBy(
    files,
    ({ mimeType, name }) => getFileType(mimeType, name) === "AUDIO"
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
      <View
        style={
          showSenderName ? styles.textContainerNoTop : styles.textContainer
        }
      >
        {/* images/videos print */}
        <MessageMedia medias={mediaMessages.true || []} />

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

        {/* voices print */}
        {(voiceMessages.true || []).map((voiceMessage) => {
          return (
            <MessageVoice
              audioRef={voiceMessage.ref}
              uuid={voiceMessage.uuid}
              mimeType={voiceMessage.mimeType}
              size={voiceMessage.size}
            />
          );
        })}

        {/* Renderizza il testo e timestamp */}
        {content &&
          content.trim().length > 0 &&
          (content.trim().length < 50 ? (
            <View style={styles.textRow}>
              <MessageText text={content} />
              <MessageTimestamp time={created_at} />
            </View>
          ) : (
            <>
              <MessageText text={content} />
              <MessageTimestamp time={created_at} />
            </>
          ))}

        {/* Se non c'è testo, mostra solo timestamp se necessario, cioè sempre */}
        {!content || content.trim().length === 0 ? (
          <MessageTimestamp time={created_at} />
        ) : null}
      </View>
    </>
  );

  if (isSender) {
    return (
      <BlurredView
        // tint={"dark"}
        style={[styles.senderBubble, showAvatar && styles.senderBubbleChained]}
      >
        <Pressable onLongPress={onLongPress} style={styles.pressable}>
          {sharedContent}
        </Pressable>
      </BlurredView>
    );
  }

  // RECEIVER
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
        <BlurredView
          tint={"dark"}
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
        </BlurredView>
      </View>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    receiverContainer: {
      alignSelf: "flex-start",
      maxWidth: "80%",
    },
    receiverRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    senderBubble: {
      overflow: "visible",
      marginVertical: 4,
      maxWidth: "80%",
      borderRadius: 18,
      alignSelf: "flex-end",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
    },
    senderBubbleChained: {
      borderBottomRightRadius: 4,
    },
    receiverBubble: {
      overflow: "visible",
      marginVertical: 4,
      marginLeft: 55,
      maxWidth: "80%",
      borderRadius: 18,
      alignSelf: "flex-start",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
    },
    receiverBubbleWithAvatar: {
      marginLeft: 10,
      borderBottomLeftRadius: 4,
    },
    pressable: {
      padding: 0,
      width: "100%",
    },
    textContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      paddingHorizontal: 12,
      paddingBottom: 8,
      paddingTop: 8,
    },
    textContainerNoTop: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      paddingHorizontal: 12,
      paddingBottom: 8,
      paddingTop: 0,
    },
    textRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
    },
    avatarWrapper: {
      marginRight: 5,
      marginBottom: 5,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 50,
    },
    senderNameWrapper: {
      paddingHorizontal: 12,
      paddingTop: 8,
    },
    senderName: {
      fontWeight: "600",
      color: theme.text,
      flexShrink: 1,
    },
  });

export default MessageBase;
