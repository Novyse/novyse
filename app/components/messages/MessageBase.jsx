import React, { useContext } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/context/ThemeContext";
import MessageAudio from "./MessageAudio";

// Importa i componenti di contenuto
import MessageText from "./MessageText";
import MessageTimestamp from "./MessageTimestamp";

const MessageBase = ({ message, isSender, onLongPress }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { text, created_at } = message;

  return (
    <LinearGradient
      colors={theme.messageContainerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={isSender ? styles.msgSender : styles.msgReceiver}
    >
      <Pressable onLongPress={onLongPress} style={styles.pressable}>
        {/* <View style={styles.content(isSender)}> */}
        {/* Renderizza la griglia di immagini se presenti */}
        {/* {content?.images && content?.images.length > 0 && (
          <ImageGrid imageUrls={content.images} />
        )} */}
        {/* Renderizza il testo se presente */}
        {text && <MessageText text={text} />}
        {/* Audio */}
        {/* <MessageAudio /> */}
        {/* Orario e stato del messaggio */}
        <MessageTimestamp time={created_at} />
        {/* </View> */}
      </Pressable>
    </LinearGradient>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    msgSender: {
      marginVertical: 5,
      maxWidth: "60%",
      borderRadius: 10,
      borderBottomRightRadius: 0,
      alignSelf: "flex-end",
      marginRight: 8,
    },
    msgReceiver: {
      marginVertical: 5,
      maxWidth: "60%",
      borderRadius: 10,
      borderBottomLeftRadius: 0,
      alignSelf: "flex-start",
      marginLeft: 8,
    },
    // content: (isSender) => ({
    //   flexDirection: "column",
    //   alignItems: isSender ? "flex-end" : "flex-start",
    //   width: "100%"
    // }),
    pressable: {
      padding: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      gap: 4,
      ...(Platform.OS === "web" && {
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }),
    },
  });

export default MessageBase;
