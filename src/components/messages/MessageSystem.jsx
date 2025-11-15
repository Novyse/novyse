// MessageSystem.jsx
import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import chatUtils from "../../utils/chat/index";

const MessageSystem = ({ type, data }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // Used to calculate system message text
  const [systemText, setSystemText] = useState("");
  useEffect(() => {
    if (type === "system") {
      const loadSystemText = async () => {
        const text = await chatUtils.getSystemMessageText(data);
        setSystemText(text);
      };
      loadSystemText();
    }
  }, [type, data]);

  switch (type) {
    case "date":
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateSeparatorText} selectable={false}>
            {data}
          </Text>
        </View>
      );
    case "system":
      return (
        <View style={styles.systemContainer}>
          <Text style={styles.systemText} selectable={false}>
            {systemText}
          </Text>
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
