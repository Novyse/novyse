import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Room } from "livekit-client";

import { useThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "../../modalSheets/AdaptiveModal";
import SettingRow from "@/src/components/settings/SettingRow";
import AppText from "@/src/components/AppText";
import { ScrollBar } from "@/constants/ScrollBar";

interface SpeakerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSpeakerSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const SpeakerSelector = ({
  visible,
  onClose,
  onSpeakerSelected,
  currentDeviceId,
}: SpeakerSelectorProps) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [availableSpeakers, setAvailableSpeakers] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSpeakers();
    }
  }, [visible]);

  const loadSpeakers = async () => {
    setLoading(true);
    try {
      const speakers = await Room.getLocalDevices("audiooutput");
      setAvailableSpeakers(speakers);
    } catch (error) {
      console.error("Error loading speakers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakerSelect = (device: MediaDeviceInfo) => {
    onSpeakerSelected(device.deviceId);
    onClose();
  };

  const renderSpeakerItem = ({
    item,
    index,
  }: {
    item: MediaDeviceInfo;
    index: number;
  }) => {
    const isSelected =
      item.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        item.deviceId === availableSpeakers[0]?.deviceId);
    const isLast = index === availableSpeakers.length - 1;

    return (
      <SettingRow
        key={item.deviceId}
        iconName="VolumeMaxIcon"
        labelKey={
          !item.label ? "chat.comms.selectors.speaker.defaultName" : undefined
        }
        labelOptions={!item.label ? { id: item.deviceId } : undefined}
        labelText={item.label || undefined}
        valueKey={
          isSelected
            ? "chat.comms.selectors.speaker.currentlySelected"
            : undefined
        }
        type="SELECT_GROUP"
        isSelected={isSelected}
        onPress={() => handleSpeakerSelect(item)}
        style={isLast ? { borderBottomWidth: 0 } : undefined}
      />
    );
  };

  const selectorContent = (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <AppText
            style={styles.loadingText}
            translationKey="chat.comms.selectors.speaker.loading"
          />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={availableSpeakers}
            style={styles.listContent}
            renderItem={renderSpeakerItem}
            keyExtractor={(item) => item.deviceId}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      snapPoints={["50%"]}
      titleTranslationKey="chat.comms.selectors.speaker.title"
    >
      {selectorContent}
    </AdaptiveModal>
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    loadingContainer: {
      padding: 40,
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
    },
    listWrapper: {
      width: "100%",
      maxHeight: 300,
      minWidth: 300,
      ...ScrollBar(theme),
    },
    listContent: {
      borderRadius: 15,
    },
  });
}

export default SpeakerSelector;
