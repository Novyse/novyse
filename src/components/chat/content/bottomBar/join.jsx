import React, { useContext } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

const JoinBar = ({ onJoin, chat }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <Pressable onPress={onJoin} style={styles.button}>
        <Text style={styles.buttonText}>
          Join{" "}
          {chat.type.charAt(0).toUpperCase() + chat.type.slice(1).toLowerCase()}
        </Text>
      </Pressable>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 55,
      backgroundColor: theme.background,
      gap: 10,
    },
    button: {
      backgroundColor: theme.backgroundJoinChatButton,
      paddingHorizontal: 30,
      paddingVertical: 13,
      borderRadius: 25,
      alignSelf: "center",
      marginHorizontal: "auto",
    },
    buttonText: {
      fontSize: 18,
      color: theme.text,
      fontWeight: "bold",
    },
  });

export default JoinBar;
