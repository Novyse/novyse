import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "../BlurredView"; // Aggiunto import per BlurredView

import chatUtils from "@/src/utils/chat/index";

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
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginVertical: 6,
      shadowColor: theme.shadowColor || "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4.5,

      elevation: 5,
    },
    text: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });
};

export default MessageSystem;
