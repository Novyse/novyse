import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Room } from "livekit-client";

import { useThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "../../modalSheets/AdaptiveModal";
import SettingRow from "@/src/components/settings/SettingRow";
import AppText from "@/src/components/AppText";
import { ScrollBar } from "@/constants/ScrollBar";

interface MicrophoneSelectorProps {
  visible: boolean;
  onClose: () => void;
  onMicrophoneSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const MicrophoneSelector = ({
  visible,
  onClose,
  onMicrophoneSelected,
  currentDeviceId,
}: MicrophoneSelectorProps) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMicrophones();
    }
  }, [visible]);

  const loadMicrophones = async () => {
    setLoading(true);
    try {
      const microphones = await Room.getLocalDevices("audioinput");
      setAvailableMicrophones(microphones);
    } catch (error) {
      console.error("Error loading microphones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophoneSelect = (device: MediaDeviceInfo) => {
    onMicrophoneSelected(device.deviceId);
    onClose();
  };

  const renderMicrophoneItem = ({ item, index }: { item: MediaDeviceInfo; index: number }) => {
    const isSelected =
      item.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        item.deviceId === availableMicrophones[0]?.deviceId);
    const isLast = index === availableMicrophones.length - 1;

    return (
      <SettingRow
        key={item.deviceId}
        iconName="Mic02Icon"
        labelKey={!item.label ? "chat.comms.selectors.microphone.defaultName" : undefined}
        labelOptions={!item.label ? { id: item.deviceId } : undefined}
        labelText={item.label || undefined}
        valueKey={isSelected ? "chat.comms.selectors.microphone.currentlySelected" : undefined}
        type="SELECT_GROUP"
        isSelected={isSelected}
        onPress={() => handleMicrophoneSelect(item)}
        style={isLast ? { borderBottomWidth: 0 } : undefined}
      />
    );
  };

  const selectorContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText
          style={styles.title}
          translationKey="chat.comms.selectors.microphone.title"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <AppText
            style={styles.loadingText}
            translationKey="chat.comms.selectors.microphone.loading"
          />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={availableMicrophones}
            renderItem={renderMicrophoneItem}
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
    >
      {selectorContent}
    </AdaptiveModal>
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    container: {
      width: "100%",
      paddingHorizontal: 20,
      paddingVertical: 10,
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
  });
}

export default MicrophoneSelector;
