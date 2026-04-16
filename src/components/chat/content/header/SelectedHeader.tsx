import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";

import Icon from "@/src/components/Icon";

import { ThemeContext } from "@/context/ThemeContext";
import PlatformType from "@/src/utils/device/type";
import useShare from "@/src/hooks/chat/useShare";

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
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const { shareMessage } = useShare();

  const handleClose = () => {
    setSelectedMessages([]);
  };

  const selectedCount = selectedMessages.length;
  const canReply = selectedCount > 0 && selectedCount <= 3;
  const isMobile = PlatformType === "mobile";

  return (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name="Cancel01Icon"
          onPress={handleClose}
          style={styles.iconButton}
        />
        <AppText style={styles.chatTitle} numberOfLines={1} text={t("chat.header.selected", { count: selectedCount })} />
      </View>

      <View style={styles.headerRight}>
        {canReply && (
          <Icon
            name="ArrowMoveUpLeftIcon"
            style={[styles.iconButton]}
            onPress={onReply}
          />
        )}
        {isMobile && selectedCount === 1 && (
          <Icon
            name="Share01Icon"
            style={styles.iconButton}
            onPress={() => shareMessage(selectedMessages[0])}
          />
        )}
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
    chatTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "600",
    },
  });
}

export default SelectedHeader;
