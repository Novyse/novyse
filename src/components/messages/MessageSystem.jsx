import React, { useContext } from "react";
import { Text, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import useUserStore from "@/context/UserContext";
import BlurredView from "../BlurredView";

import messageUtils from "@/src/utils/chat/messageFormat";

const MessageSystem = ({ type, data }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // trigger re-renders when user data changes
  useUserStore((state) => state.users[data?.content]);

  const systemText =
    type === "system" ? messageUtils.getSystemMessageText(data) : "";

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
      textAlign: "center",
    },
  });
};

export default MessageSystem;
