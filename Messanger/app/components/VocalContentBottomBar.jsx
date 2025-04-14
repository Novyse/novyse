import React, { useContext, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import APIMethods from "../utils/APImethods";
import localDatabase from "../utils/localDatabaseMethods";

const VocalContentBottomBar = ({ chatId, selfJoined, selfLeft, WebRTC }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isJoinedVocal, setIsJoinedVocal] = useState(WebRTC.chatId == chatId);

  return (
    <View style={styles.container}>
      {!isJoinedVocal ? (
        <Pressable
          style={styles.iconButton}
          onPress={async () => {
            const data = await APIMethods.commsJoin(chatId);
            if (data.comms_joined) {
              selfJoined({
                from: data.from,
                handle: await localDatabase.fetchLocalUserHandle(),
                chat_id: chatId,
              });
              setIsJoinedVocal(true);
            }
          }}
        >
          <Icon name="phone" size={24} color="green" />
        </Pressable>
      ) : (
        <Pressable
          style={styles.iconButton}
          onPress={async () => {
            const data = await APIMethods.commsLeave();
            if (data.comms_left) {
              selfLeft(data);
              setIsJoinedVocal(false);
            }
          }}
        >
          <Icon name="phone" size={24} color="red" />
        </Pressable>
      )}
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
