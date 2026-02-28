import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";

import { useThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

import useMessageAction from "@/src/hooks/chat/useMessageAction";
import useMessage from "@/src/hooks/chat/useMessage";

import BlurredView from "../BlurredView";
import { getFileType } from "@/src/utils/storage/file/type";
import { defaultWaveform } from "@/src/utils/storage/file/media";

import MessageTimestamp from "./MessageTimestamp";
import Avatar from "../Avatar";

import MessageMedia from "./MessageMedia";
import MessageOther from "./MessageOther";
import MessageAudio from "./MessageAudio";
import MessageVoice from "./MessageVoice";
import MessageText from "./MessageText";
import MessageReply from "./MessageReply";

const MessageBase = ({
  message,
  isSender,
  isSelected,
  setTriggeredMessage,
  setTriggeredMessagePosition,
  selectedMessage,
  setSelectedMessage,
}) => {
  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme);

  const {
    onMessageRightPress,
    onMessagePress,
    onMessageDoublePress,
    onMessageLongPress,
  } = useMessageAction(
    setTriggeredMessage,
    setTriggeredMessagePosition,
    selectedMessage,
    setSelectedMessage,
  );

  const {
    content,
    created_at,
    replyTo,
    showSenderName = false,
    showAvatar = false,
    sender_name,
    type,
    files = [],
  } = message;

  const { message: replyMessage } = useMessage(
    replyTo?.chatUUID,
    replyTo?.messageID,
  );

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
    ({ mimeType, name }) => getFileType(mimeType, name) === "VOICE",
  );

  const audioMessages = groupBy(
    files,
    ({ mimeType, name }) => getFileType(mimeType, name) === "AUDIO",
  );

  const mediaMessages = groupBy(
    files,
    ({ mimeType }) =>
      getFileType(mimeType) === "IMAGE" || getFileType(mimeType) === "VIDEO",
  );

  const otherMessages = groupBy(files, ({ mimeType }) =>
    ["DOCUMENT", "CODE", "ARCHIVE", "OTHER"].includes(getFileType(mimeType)),
  );

  const hasOnlyMedia =
    (!content || content.trim().length === 0) &&
    (mediaMessages.true || []).length > 0;

  const sharedContent = (
    <View
      style={
        hasOnlyMedia
          ? styles.mediaContainer
          : showSenderName && !replyTo
            ? styles.textContainerNoTop
            : styles.textContainer
      }
    >
      {/* Reply preview */}

      {replyMessage && (
        <MessageReply
          senderName={replyMessage.sender_name}
          text={replyMessage.content}
        />
      )}

      {/* images/videos */}
      {mediaMessages && <MessageMedia medias={mediaMessages.true || []} />}

      {/* other files */}
      {(otherMessages.true || []).map((otherMessage) => (
        <MessageOther
          key={otherMessage.uuid}
          fileRef={otherMessage.ref}
          uuid={otherMessage.uuid}
          mimeType={otherMessage.mimeType}
          size={otherMessage.size}
          name={otherMessage.name}
        />
      ))}

      {/* audio */}
      <View style={{ width: "100%" }}>
        {(audioMessages.true || []).map((audioMessage) => (
          <MessageAudio
            key={audioMessage.uuid}
            audioRef={audioMessage.ref}
            uuid={audioMessage.uuid}
            size={audioMessage.size}
            name={audioMessage.name}
            message={message}
            duration={audioMessage.duration}
          />
        ))}
      </View>

      {/* voice */}
      <View style={{ width: "100%" }}>
        {(voiceMessages.true || []).map((voiceMessage) => {
          const waveform = Array.isArray(voiceMessage.waveform)
            ? voiceMessage.waveform
            : JSON.parse(
                voiceMessage.waveform || JSON.stringify(defaultWaveform),
              ) || defaultWaveform;
          return (
            <MessageVoice
              key={voiceMessage.uuid}
              audioRef={voiceMessage.ref}
              uuid={voiceMessage.uuid}
              message={message}
              duration={voiceMessage.duration}
              waveform={waveform}
            />
          );
        })}
      </View>

      {/* testo + timestamp */}
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

      {!content || content.trim().length === 0 ? (
        <MessageTimestamp time={created_at} />
      ) : null}
    </View>
  );

  const blurredViewStyles = isSender
    ? [styles.senderBubble, showAvatar && styles.senderBubbleChained]
    : [styles.receiverBubble, showAvatar && styles.receiverBubbleWithAvatar];

  const pressableStyles = isSender
    ? styles.pressable
    : styles.pressableReceiver;

  return (
    <>
      <View style={styles.container}>
        <Pressable
          onPress={(event) => onMessagePress(event, message)}
          onLongPress={(event) => onMessageLongPress(event, message)}
          onContextMenu={(event) => {
            event.preventDefault();
            onMessageRightPress(event, message);
          }}
          onDoubleClick={(event) => onMessageDoublePress(event, message)}
          style={pressableStyles}
        >
          {!isSender && showAvatar && (
            <Avatar size={40} uuid={message.profile_picture_uuid} />
          )}
          <BlurredView style={blurredViewStyles}>
            {!isSender && showSenderName && (
              <View style={styles.senderNameWrapper}>
                <Text
                  style={styles.senderName}
                  numberOfLines={1}
                  selectable={false}
                >
                  {sender_name}
                </Text>
              </View>
            )}
            {sharedContent}
            {isSelected && !isSmallScreen && (
              <View style={styles.selectedOverlay} />
            )}
          </BlurredView>
        </Pressable>
      </View>
      {isSelected && isSmallScreen && <View style={styles.selectedOverlay} />}
    </>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    pressable: {
      padding: 0,
      width: "100%",
      paddingRight: 10,
      paddingLeft: 10,
    },
    pressableReceiver: {
      padding: 0,
      width: "100%",
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
      overflow: "hidden",
    },
    senderBubbleChained: {
      borderBottomRightRadius: 4,
    },
    receiverBubble: {
      overflow: "visible",
      marginVertical: 4,
      marginLeft: 58,
      maxWidth: "80%",
      borderRadius: 18,
      alignSelf: "flex-start",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 5,
      overflow: "hidden",
    },
    receiverBubbleWithAvatar: {
      marginLeft: 10,
      borderBottomLeftRadius: 4,
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
    mediaContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      paddingHorizontal: 0,
      paddingBottom: 0,
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
    selectedOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(174, 213, 255, 0.5)",
      zIndex: 1,
      pointerEvents: "none",
    },
  });

export default React.memo(MessageBase, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.isSender === nextProps.isSender &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectedMessage === nextProps.selectedMessage
  );
});
