import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";

import Icon from "@/src/components/Icon";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/header/AppHeaderRow";

import { ThemeContext } from "@/src/context/ThemeContext";
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
    <AppHeaderRow
      left={
        <View style={styles.headerLeft}>
          <Icon
            name="Cancel01Icon"
            onPress={handleClose}
            style={headerIconButtonStyle.iconButton}
          />
          <AppText
            style={styles.chatTitle}
            numberOfLines={1}
            text={t("chat.header.selected", { count: selectedCount })}
          />
        </View>
      }
      right={
        <>
          {canReply && (
            <Icon
              name="ArrowMoveUpLeftIcon"
              style={headerIconButtonStyle.iconButton}
              onPress={onReply}
            />
          )}
          {isMobile && selectedCount === 1 && (
            <Icon
              name="Share01Icon"
              style={headerIconButtonStyle.iconButton}
              onPress={() => shareMessage(selectedMessages[0])}
            />
          )}
          <Icon
            name="LinkForwardIcon"
            style={headerIconButtonStyle.iconButton}
            onPress={onForward}
          />
          <Icon
            name="Delete02Icon"
            color={theme.iconDanger}
            style={headerIconButtonStyle.iconButton}
            onPress={onDelete}
          />
        </>
      }
    />
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    chatTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "600",
    },
  });
}

export default SelectedHeader;
