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
import MessageText from "./MessageText";
import MessageTimestamp from "./MessageTimestamp";
import MessageAudio from "./MessageAudio"; // Importato

const MessageBase = ({ message, isSender, onLongPress }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    text,
    created_at,
    showSenderName = false,
    showAvatar = false,
    sender_name,
    type,
    attachments, // Assumiamo che l'audio sia qui o definito dal type
  } = message;

  // Determina se è un messaggio audio
  const isAudioMessage =
    type === "audio" ||
    (attachments && attachments.some((a) => a.type === "audio"));

  // Recupera l'URI e la durata (se disponibile)
  const audioAttachment = isAudioMessage
    ? attachments
      ? attachments.find((a) => a.type === "audio")
      : message
    : null;
  const audioUri = audioAttachment?.uri || audioAttachment?.url;
  

  const sharedContent = (
    <>
      <View style={styles.textContainer}>
        {/* Renderizza Audio Player SOLO se è un messaggio audio */}
        {isAudioMessage && audioUri && (
          <MessageAudio audioUri={audioUri} />
        )}

        {/* Renderizza il testo SOLO se esiste ed è diverso da stringa vuota */}
        {text && text.trim().length > 0 && <MessageText text={text} />}

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
