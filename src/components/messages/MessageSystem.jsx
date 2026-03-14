import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "../BlurredView";

import messageUtils from "@/src/utils/chat/messageFormat";

const MessageSystem = ({ type, data }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  // Used to calculate system message text
  const [systemText, setSystemText] = useState("");

  useEffect(() => {
    if (type === "system") {
      const loadSystemText = async () => {
        const text = messageUtils.getSystemMessageText(data);
        setSystemText(text);
      };
      loadSystemText();
    }
  }, [type, data]);

  const renderPill = (content) => (
    <BlurredView
      colors={theme.backgroundDateSeparator}
      style={styles.container}
    >
      <Text style={styles.text} selectable={false}>
        {content}
      </Text>
    </BlurredView>
  );

  switch (type) {
    case "date":
      return renderPill(data);
    case "system":
      return renderPill(systemText);
    default:
      return null;
  }
};

const createStyles = (theme) => {
  return StyleSheet.create({
    container: {
      alignSelf: "center",
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 5,
      marginVertical: 6,
    },
    text: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center"
    },
  });
};

export default MessageSystem;
