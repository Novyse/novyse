import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { Platform } from "react-native";

import { Room } from "livekit-client";

import { useThemeContext } from "@/context/ThemeContext";

import ModalBase from "@/src/components/modals/ModalBase";
import Icon from "@/src/components/Icon";

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
          color={isSelected ? "#4CAF50" : theme.text}
        />
        <View style={styles.cameraInfo}>
          <Text style={[styles.cameraName, isSelected && styles.selectedText]}>
            {item.label || `Camera ${item.deviceId}`}
          </Text>
          {isSelected && (
            <Text style={styles.currentLabel}>Currently Selected</Text>
          )}
        </View>
        {isSelected && <Icon name={"Tick02Icon"} color="#4CAF50" />}
      </Pressable>
    );
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Camera</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading cameras...</Text>
        </View>
      ) : (
        <FlatList
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
      color: "white",
    },
    closeButton: {
      padding: 4,
    },
    loadingContainer: {
      padding: 40,
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: "white",
    },
    cameraList: {
      maxHeight: 300,
      padding: 20,
      ...(Platform.OS === "web" && {
        // Standard per Firefox (fisso, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    cameraItem: {
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
      borderColor: "#4CAF50",
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
      color: "#4CAF50",
    },
    currentLabel: {
      fontSize: 12,
      color: "#4CAF50",
      marginTop: 2,
    },
  });
}

export default CameraSelector;
