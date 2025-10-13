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

  // Messaggi inviati: bolla a destra senza nome/avatar, angoli arrotondati condizionali
  if (isSender) {
    return (
      <SmartBackground
        colors={theme.backgroundMessageBaseGradient}
        style={[styles.senderBubble, showAvatar && styles.senderBubbleChained]}
      >
        <Pressable onLongPress={onLongPress} style={styles.pressable}>
          <View style={styles.contentContainer}>
            {text && <MessageText text={text} />}
          </View>
          <MessageTimestamp time={created_at} />
        </Pressable>
      </SmartBackground>
    );
  }

  // Messaggi ricevuti: bolla a sinistra con nome/avatar opzionali
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
            <View style={styles.contentContainer}>
              {text && <MessageText text={text} />}
            </View>
            <MessageTimestamp time={created_at} />
          </Pressable>
        </SmartBackground>
      </View>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    // CONTAINER PRINCIPALI
    receiverContainer: {
      alignSelf: "flex-start",
      maxWidth: "80%",
    },
    receiverRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    // BOLLE MESSAGGI
    senderBubble: {
      overflow: "hidden",
      marginVertical: 3,
      marginRight: 8,
      maxWidth: "80%",
      minWidth: 70,
      borderRadius: 10,
      alignSelf: "flex-end",
    },
    senderBubbleChained: {
      borderBottomRightRadius: 0,
    },
    receiverBubble: {
      overflow: "hidden",
      marginVertical: 3,
      marginLeft: 58,
      maxWidth: "80%",
      minWidth: 70,
      borderRadius: 10,
      alignSelf: "flex-start",
    },
    receiverBubbleWithAvatar: {
      marginLeft: 10,
      borderBottomLeftRadius: 0,
    },
    // CONTENUTO MESSAGGI
    pressable: {
      padding: 10,
      width: "100%",
    },
    contentContainer: {
      flexDirection: "column",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }),
    },
    // AVATAR
    avatarWrapper: {
      marginRight: 5,
      marginLeft: 3,
      marginBottom: 5,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    // NOME MITTENTE
    senderNameWrapper: {},
    senderName: {
      fontWeight: "600",
      color: theme.primary || theme.text,
      flexShrink: 1,
    },
  });

export default MessageBase;
