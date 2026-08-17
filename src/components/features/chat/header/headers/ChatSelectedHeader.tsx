import React from "react";
import { StyleSheet, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";

import Icon from "@/src/components/ui/icon/Icon";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";
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
  setSelectedMessages,
  selectedMessages,
  onForward,
  onDelete,
  onReply,
}) => {
  const { t } = useTranslation();
  const styles = createStyle();
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
          <Typography
            weight="semibold"
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
            style={headerIconButtonStyle.iconButton}
            onPress={onDelete}
          />
        </>
      }
    />
  );
};

function createStyle() {
  return StyleSheet.create({
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
  });
}

export default SelectedHeader;
