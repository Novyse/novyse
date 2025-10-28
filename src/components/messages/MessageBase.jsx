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
import MessageImagesVideos from "./MessageImagesVideos";

const MessageBase = ({ message, isSender, onLongPress }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    text,
    created_at,
    showSenderName = false,
    showAvatar = false,
    sender_name,
  } = message;

  const sharedContent = (
    <>
      <View style={styles.mediaContainer}>
        <MessageImagesVideos />
      </View>
      <View style={styles.textContainer}>
        {text && <MessageText text={text} />}
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
                <Text
                  style={styles.senderName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  selectable={false}
                >
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

const createStyle = (theme) =>
  StyleSheet.create({
    // Contenitori principali
    receiverContainer: {
      alignSelf: "flex-start",
      maxWidth: "80%",
    },
    receiverRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    // Bolle messaggi (base semplificata)
    senderBubble: {
      overflow: "hidden",
      marginVertical: 2,
      marginRight: 8,
      maxWidth: "80%",
      borderRadius: 10,
      alignSelf: "flex-end",
    },
    senderBubbleChained: {
      borderBottomRightRadius: 0,
    },
    receiverBubble: {
      overflow: "hidden",
      marginVertical: 2,
      marginLeft: 58,
      maxWidth: "80%",
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    receiverBubbleWithAvatar: {
      marginLeft: 10,
      borderBottomLeftRadius: 0,
    },
    // Contenuti messaggi (padding gestibili separatamente)
    pressable: {
      padding: 0,
      width: "100%",
    },
    mediaContainer: {
      paddingBottom: 8,
    },
    textContainer: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      paddingHorizontal: 12, // Padding personalizzabile per text + timestamp
      paddingBottom: 8,
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }),
    },
    // Avatar
    avatarWrapper: {
      marginRight: 5,
      marginBottom: 5,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    // Nome mittente
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
