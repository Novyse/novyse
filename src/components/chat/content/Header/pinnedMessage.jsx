import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

const PinnedMessageHeader = ({}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.headerSecondaryRow}>
      <View style={styles.pinnedContainer}>
        <Text style={styles.pinnedText} numberOfLines={1}>
          📌 Messaggio importante fissato in alto
        </Text>
      </View>
    </View>
  );
};

function createStyle(theme) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
    },
    contentWrapper: {
      flex: 1,
    },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    headerBase: {
      overflow: "hidden",
    },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      paddingBottom: 0,
    },
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_MAIN_HEIGHT,
      paddingHorizontal: 8,
      width: "100%",
    },
    headerLeft: {
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    headerSecondaryRow: {
      width: "100%",
      paddingHorizontal: 12,
      paddingBottom: 8,
      justifyContent: "center",
    },
    pinnedContainer: {
      backgroundColor: "rgba(0,0,0,0.05)",
      padding: 6,
      borderRadius: 8,
      width: "100%",
    },
    voiceControlContainer: {
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 12,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: theme.placeholder || "#ccc",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    pinnedText: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.9,
    },
    splitContainer: {
      flex: 1,
      flexDirection: "row",
    },
    splitPanel: {
      flex: 1,
      height: "100%",
    },
    splitSeparator: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      height: "100%",
    },
  });
}

export default PinnedMessageHeader;
