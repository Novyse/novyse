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
    case "system":
      return (
        <View style={styles.systemContainer}>
          <Text style={styles.systemText}>{data}</Text>
        </View>
      );
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
    systemContainer: {
      alignSelf: "center",
      backgroundColor: theme.backgroundDateSeparator,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      marginVertical: 10,
    },
    systemText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
    },
  });
};

export default MessageSystem;
