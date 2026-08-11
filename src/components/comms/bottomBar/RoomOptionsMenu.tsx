import React, { useContext } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import SettingsSelectGroup from "@/src/components/features/settings/SettingsSelectGroup";
import {
  useMediaDeviceOptions,
  SPEAKER_DEVICE_OPTIONS,
} from "@/src/components/comms/bottomBar/useMediaDeviceOptions";

interface RoomOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenWatchTogether: () => void;
  showAudioOutput?: boolean;
  speakerDevice?: string;
  onSpeakerSelected?: (deviceId: string) => void;
}

export const RoomOptionsMenu: React.FC<RoomOptionsMenuProps> = ({
  visible,
  onClose,
  onOpenWatchTogether,
  showAudioOutput = false,
  speakerDevice = "",
  onSpeakerSelected,
}) => {
  const { theme } = useContext(ThemeContext);
  const { room } = useCommsContext();
  const styles = createStyles(theme);

  const { options, loading } = useMediaDeviceOptions({
    enabled: visible && showAudioOutput,
    currentDeviceId: speakerDevice,
    ...SPEAKER_DEVICE_OPTIONS,
  });

  const roomMetadata = room?.metadata ? JSON.parse(room.metadata) : null;
  const watchTogether = roomMetadata?.watchTogether;
  const isVideoActive = !!watchTogether?.url;

  const handleSpeakerChange = (deviceId: string) => {
    onSpeakerSelected?.(deviceId);
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      scrollable={showAudioOutput}
      hideCloseX={true}
      popover={true}
    >
      <View style={styles.content}>
        {showAudioOutput && (
          <View>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} size="small" />
                <Typography translationKey="chat.comms.selectors.speaker.loading" />
              </View>
            ) : (
              <View style={styles.listWrapper}>
                <SettingsSelectGroup
                  options={options}
                  value={speakerDevice}
                  onChange={handleSpeakerChange}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.menuColumn}>
          <HoverAndPressedButton
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenWatchTogether();
            }}
          >
            <View style={styles.menuItemContent}>
              <Icon name="Link01Icon" size={20} />
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
      gap: 25,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 15,
      paddingHorizontal: 5,
    },
    listWrapper: {
      borderRadius: 25,
      overflow: "hidden",
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
