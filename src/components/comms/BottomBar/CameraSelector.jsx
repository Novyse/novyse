import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { Room } from "livekit-client";

import { useThemeContext } from "@/src/context/ThemeContext";

import ModalBase from "../../modalSheets/ModalBase";
import Icon from "@/src/components/Icon";
import AppText from "@/src/components/AppText";
import { ScrollBar } from "@/constants/ScrollBar";

const CameraSelector = ({
  visible,
  onClose,
  onCameraSelected,
  currentDeviceId,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  const [availableCameras, setAvailableCameras] = useState([]);
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

  const handleCameraSelect = (device) => {
    onCameraSelected(device.deviceId);
    onClose();
  };

  const renderCameraItem = ({ item }) => {
    const isSelected =
      item.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        item.deviceId === availableCameras[0]?.deviceId);
    return (
      <Pressable
        style={[styles.cameraItem, isSelected && styles.selectedCamera]}
        onPress={() => handleCameraSelect(item)}
      >
        <Icon
          name={"Camera01Icon"}
          color={isSelected ? theme.iconSuccess : theme.text}
        />
        <View style={styles.cameraInfo}>
          <AppText
            style={[styles.cameraName, isSelected && styles.selectedText]}
          >
            {item.label ||
              t("chat.comms.selectors.camera.defaultName", {
                id: item.deviceId,
              })}
          </AppText>
          {isSelected && (
            <AppText
              style={styles.currentLabel}
              translationKey="chat.comms.selectors.camera.currentlySelected"
            />
          )}
        </View>
        {isSelected && <Icon name={"Tick02Icon"} color={theme.iconSuccess} />}
      </Pressable>
    );
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.header}>
        <AppText
          style={styles.title}
          translationKey="chat.comms.selectors.camera.title"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <AppText
            style={styles.loadingText}
            translationKey="chat.comms.selectors.camera.loading"
          />
        </View>
      ) : (
        <FlashList
          data={availableCameras}
          renderItem={renderCameraItem}
          keyExtractor={(item) => item.deviceId}
          style={styles.cameraList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ModalBase>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
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
    cameraList: {
      width: "100%",
      maxHeight: 300,
      minWidth: 300,
      padding: 20,
      ...ScrollBar(theme),
    },
    cameraItem: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.backgroundMainGradient[1],
    },
    selectedCamera: {
      backgroundColor: theme.backgroundMainGradient[1],
      borderWidth: 1,
      borderColor: theme.successText,
    },
    cameraInfo: {
      flex: 1,
      marginLeft: 12,
    },
    cameraName: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500",
    },
    selectedText: {
      color: theme.successText,
    },
    currentLabel: {
      fontSize: 12,
      color: theme.successText,
      marginTop: 2,
    },
  });
}

export default CameraSelector;
