import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Room } from "livekit-client";

import { useThemeContext } from "@/src/context/ThemeContext";
import AdaptiveModal from "../../modalSheets/AdaptiveModal";
import SettingRow from "@/src/components/features/settings/SettingRow";
import AppText from "@/src/components/ui/text/AppText";
import { ScrollBar } from "@/constants/ScrollBar";

interface CameraSelectorProps {
  visible: boolean;
  onClose: () => void;
  onCameraSelected: (deviceId: string) => void;
  currentDeviceId: string;
}

const CameraSelector = ({
  visible,
  onClose,
  onCameraSelected,
  currentDeviceId,
}: CameraSelectorProps) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCameras();
    }
  }, [visible]);

  const loadCameras = async () => {
    setLoading(true);
    try {
      const cameras = await Room.getLocalDevices("videoinput");
      setAvailableCameras(cameras);
    } catch (error) {
      console.error("Error loading cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraSelect = (device: MediaDeviceInfo) => {
    onCameraSelected(device.deviceId);
    onClose();
  };

  const renderCameraItem = ({
    item,
    index,
  }: {
    item: MediaDeviceInfo;
    index: number;
  }) => {
    const isSelected =
      item.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        item.deviceId === availableCameras[0]?.deviceId);
    const isLast = index === availableCameras.length - 1;

    return (
      <SettingRow
        key={item.deviceId}
        iconName="Camera01Icon"
        labelKey={
          !item.label ? "chat.comms.selectors.camera.defaultName" : undefined
        }
        labelOptions={!item.label ? { id: item.deviceId } : undefined}
        labelText={item.label || undefined}
        valueKey={
          isSelected
            ? "chat.comms.selectors.camera.currentlySelected"
            : undefined
        }
        type="SELECT_GROUP"
        isSelected={isSelected}
        onPress={() => handleCameraSelect(item)}
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
            translationKey="chat.comms.selectors.camera.loading"
          />
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlashList
            data={availableCameras}
            style={styles.listContent}
            renderItem={renderCameraItem}
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
      titleTranslationKey="chat.comms.selectors.camera.title"
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

export default CameraSelector;
