import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { Platform } from "react-native";
import { ThemeContext } from "@react-navigation/native";
import Icon from "../Icon";

// Import mediaDevices from react-native-webrtc
let mediaDevices;
if (Platform.OS === "web") {
  const WebRTCLib = require("react-native-webrtc-web-shim");
  mediaDevices = WebRTCLib.mediaDevices;
} else {
  const WebRTCLib = require("react-native-webrtc");
  mediaDevices = WebRTCLib.mediaDevices;
}

const CameraSelector = ({
  visible,
  onClose,
  onCameraSelected,
  currentDeviceId,
}) => {
  const [availableCameras, setAvailableCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  useEffect(() => {
    if (visible) {
      loadCameras();
    }
  }, [visible]);

  const loadCameras = async () => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        // Web platform - use enumerateDevices
        const devices = await mediaDevices.enumerateDevices();
        const cameras = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setAvailableCameras(cameras);
      } else {
        // Mobile platform - limited device enumeration
        // For now, we'll show a basic list since react-native-webrtc has limited device enumeration
        setAvailableCameras([
          { deviceId: "default", label: "Default Camera" },
          { deviceId: "front", label: "Front Camera" },
          { deviceId: "back", label: "Back Camera" },
        ]);
      }
    } catch (error) {
      console.error("Error loading cameras:", error);
      Alert.alert("Error", "Failed to load available cameras");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraSelect = (device) => {
    onCameraSelected(device.deviceId);
    onClose();
  };

  const renderCameraItem = ({ item }) => (
    <Pressable
      style={[
        styles.cameraItem,
        item.deviceId === currentDeviceId && styles.selectedCamera,
      ]}
      onPress={() => handleCameraSelect(item)}
    >
      <Icon
        name={"Video02Icon"}
        color={item.deviceId === currentDeviceId ? "#4CAF50" : "#666"}
      />
      <View style={styles.cameraInfo}>
        <Text
          style={[
            styles.cameraName,
            item.deviceId === currentDeviceId && styles.selectedText,
          ]}
        >
          {item.label || `Camera ${item.deviceId}`}
        </Text>
        {item.deviceId === currentDeviceId && (
          <Text style={styles.currentLabel}>Currently Selected</Text>
        )}
      </View>
      {item.deviceId === currentDeviceId && (
        <Icon name={"Tick02Icon"} color="#4CAF50" />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Camera</Text>
            <Icon
              name={"Cancel01Icon"}
              color="#666"
              onPress={onClose}
              style={styles.closeButton}
            />
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

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: 12,
      padding: 20,
      width: "90%",
      maxWidth: 400,
      maxHeight: "70%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: "600",
      color: "#333",
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
      color: "#666",
    },
    cameraList: {
      maxHeight: 300,
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
      backgroundColor: "#f5f5f5",
    },
    selectedCamera: {
      backgroundColor: "#e8f5e8",
      borderWidth: 1,
      borderColor: "#4CAF50",
    },
    cameraInfo: {
      flex: 1,
      marginLeft: 12,
    },
    cameraName: {
      fontSize: 16,
      color: "#333",
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
    footer: {
      marginTop: 20,
      alignItems: "center",
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 6,
      backgroundColor: "#f0f0f0",
    },
    cancelButtonText: {
      fontSize: 16,
      color: "#666",
      fontWeight: "500",
    },
  });
}

export default CameraSelector;
