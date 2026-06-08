import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import HoverAndPressedButton from "../../HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import AdaptiveModal from "../../modalSheets/AdaptiveModal";

interface RoomOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenWatchTogether: () => void;
}

export const RoomOptionsMenu: React.FC<RoomOptionsMenuProps> = ({
  visible,
  onClose,
  onOpenWatchTogether,
}) => {
  const { theme } = useContext(ThemeContext);
  const { room } = useCommsContext();
  const styles = createStyles(theme);

  const roomMetadata = room?.metadata ? JSON.parse(room.metadata) : null;
  const watchTogether = roomMetadata?.watchTogether;
  const isVideoActive = !!watchTogether?.url;

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      scrollable={false}
      hideCloseX={true}
      hideOverlay={true}
      popover={true}
    >
      <View style={styles.content}>
        <View style={styles.menuColumn}>
          <HoverAndPressedButton
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenWatchTogether();
            }}
          >
            <View style={styles.menuItemContent}>
              <Icon name="Link01Icon" size={20} color={theme.text} />
              <AppText
                style={styles.menuText}
                translationKey={
                  isVideoActive
                    ? "chat.comms.roomOptions.modifyWatchTogether"
                    : "chat.comms.roomOptions.startWatchTogether"
                }
              />
            </View>
          </HoverAndPressedButton>
        </View>
      </View>
    </AdaptiveModal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    content: {
      padding: 16,
    },
    menuColumn: {
      flexDirection: "column",
      gap: 6,
    },
    menuItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.backgroundTextField,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    menuText: {
      fontSize: 14,
      color: theme.text,
      fontWeight: "600",
    },
  });
