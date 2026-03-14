import React, { useContext } from "react";
import { View, StyleSheet, Text } from "react-native";

import Icon from "@/src/components/Icon";

import { ThemeContext } from "@/context/ThemeContext";

interface SelectedHeaderProps {
  selectedMessages: any[];
  setSelectedMessages: (messages: any[]) => void;
  onForward?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
}

const SelectedHeader: React.FC<SelectedHeaderProps> = ({
  selectedMessages,
  setSelectedMessages,
  onForward,
  onDelete,
  onReply,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleClose = () => {
    setSelectedMessages([]);
  };

  const selectedCount = selectedMessages.length;
  const canReply = selectedCount > 0 && selectedCount <= 5;

  return (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name="Cancel01Icon"
          onPress={handleClose}
          style={styles.iconButton}
        />
        <Text style={styles.chatTitle} numberOfLines={1}>
          {selectedCount} selected
        </Text>
      </View>

      <View style={styles.headerRight}>
        <Icon
          name="ArrowMoveUpLeftIcon"
          style={[styles.iconButton, !canReply && styles.disabledIcon]}
          onPress={canReply ? onReply : undefined}
        />
        <Icon
          name="LinkForwardIcon"
          style={styles.iconButton}
          onPress={onForward}
        />
        <Icon
          name="Delete02Icon"
          color={"red"}
          style={styles.iconButton}
          onPress={onDelete}
        />
      </View>
    </View>
  );
};

function createStyle(theme: any) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: HEADER_MAIN_HEIGHT,
      width: "100%",
      paddingHorizontal: 8,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    disabledIcon: {
      opacity: 0.3,
    },
    chatTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "600",
    },
  });
}

export default SelectedHeader;
