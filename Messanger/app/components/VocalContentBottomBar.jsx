import React, { useContext } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import WebSocketMethods from "../utils/webSocketMethods";

const VocalContentBottomBar = ({ chatId, selfJoined, selfLeft }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.iconButton}
        onPress={async () => {
          await WebSocketMethods.EmitJoinVocalChat(chatId);
          selfJoined();
        }}
      >
        <Icon name="phone" size={24} color="green" />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        onPress={async () => {
          await WebSocketMethods.EmitLeaveVocalChat(chatId);
          selfLeft();
        }}
      >
        <Icon name="phone" size={24} color="red" />
      </Pressable>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 15,
    },
    iconButton: {
      backgroundColor: "black",
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default VocalContentBottomBar;
