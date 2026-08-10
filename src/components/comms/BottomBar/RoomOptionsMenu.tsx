import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";

interface RoomOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenWatchTogether: () => void;
}

// ! @MatteoMagnani7 da rifare bene anche lui, magari come Context Menu

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
              <Icon name="Link01Icon" size={20}/>
              <Typography
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
      gap: 25
    },
    menuColumn: {
      flexDirection: "column",
    },
    menuItem: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
      backgroundColor: theme.backgroundTextField,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
  });
