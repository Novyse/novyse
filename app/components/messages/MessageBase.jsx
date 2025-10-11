import React, { useContext } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/context/ThemeContext";
import MessageAudio from "./MessageAudio";
import MessageImagesVideos from "./MessageImagesVideos";

// Importa i componenti di contenuto
import MessageText from "./MessageText";
import MessageTimestamp from "./MessageTimestamp";
import SmartBackground from "../SmartBackground";

const MessageBase = ({ message, isSender, onLongPress }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { text, created_at } = message;

  return (
    <SmartBackground
      colors={theme.backgroundMessageBaseGradient}
      style={isSender ? styles.msgSender : styles.msgReceiver}
    >
      <Pressable onLongPress={onLongPress} style={styles.pressable}>
        {/* <MessageImagesVideos /> */}

        <View style={styles.bottomMessage}>
          {text && <MessageText text={text} />}

          {/* <MessageAudio /> */}

          <MessageTimestamp time={created_at} />
        </View>
      </Pressable>
    </SmartBackground>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    msgSender: {
      overflow: "hidden",
      marginVertical: 5,
      maxWidth: "60%",
      borderRadius: 10,
      borderBottomRightRadius: 0,
      alignSelf: "flex-end",
      marginRight: 8,
    },
    msgReceiver: {
      overflow: "hidden",
      marginVertical: 5,
      maxWidth: "60%",
      borderRadius: 10,
      borderBottomLeftRadius: 0,
      alignSelf: "flex-start",
      marginLeft: 8,
    },
    bottomMessage: {
      padding: 10,
      gap: 15,
      flexDirection: "column",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }),
    },
    pressable: {
      padding: 0,
    },
  });

export default MessageBase;
