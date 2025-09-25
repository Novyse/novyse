// MessageSystem.jsx
import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

const MessageSystem = ({ type, data }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  switch (type) {
    case "date":
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText}>{data}</Text>
        </View>
      );
    // Aggiungi altri casi per tipi di messaggi di sistema futuri, es:
    // case "userJoined":
    //   return (
    //     <View style={styles.systemMessage}>
    //       <Text style={styles.systemText}>{data}</Text>
    //     </View>
    //   );
    default:
      return null;
  }
};

const createStyles = (theme) => {
  return StyleSheet.create({
    dateSeparator: {
      alignSelf: "center",
      backgroundColor: theme.backgroundDateSeparator,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      marginVertical: 10,
    },
    dateSeparatorText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
    },
    // Stili aggiuntivi per futuri tipi di messaggi di sistema
    // systemMessage: {
    //   alignSelf: "center",
    //   backgroundColor: theme.systemMessageBackground,
    //   paddingHorizontal: 15,
    //   paddingVertical: 8,
    //   borderRadius: 15,
    //   marginVertical: 5,
    // },
    // systemText: {
    //   color: theme.systemTextColor,
    //   fontSize: 12,
    //   fontStyle: "italic",
    // },
  });
};

export default MessageSystem;
