import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Import mediaDevices from react-native-webrtc
let mediaDevices;
if (Platform.OS === "web") {
  const WebRTCLib = require("react-native-webrtc-web-shim");
  mediaDevices = WebRTCLib.mediaDevices;
} else {
  const WebRTCLib = require("react-native-webrtc");
  mediaDevices = WebRTCLib.mediaDevices;
}

const MicrophoneSelector = ({ visible, onClose, onMicrophoneSelected, currentDeviceId }) => {
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMicrophones();
    }
  }, [visible]);

  const loadMicrophones = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web platform - use enumerateDevices
        const devices = await mediaDevices.enumerateDevices();
        const microphones = devices.filter(device => device.kind === 'audioinput');
        setAvailableMicrophones(microphones);
      } else {
        // Mobile platform - limited device enumeration
        // For now, we'll show a basic list since react-native-webrtc has limited device enumeration
        setAvailableMicrophones([
          { deviceId: 'default', label: 'Default Microphone' },
          { deviceId: 'communications', label: 'Communications Microphone' },
        ]);
      }
    } catch (error) {
      console.error('Error loading microphones:', error);
      Alert.alert('Error', 'Failed to load available microphones');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophoneSelect = (device) => {
    onMicrophoneSelected(device.deviceId);
    onClose();
  };

  const renderMicrophoneItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.microphoneItem,
        item.deviceId === currentDeviceId && styles.selectedMicrophone
      ]}
      onPress={() => handleMicrophoneSelect(item)}
    >
      <MaterialIcons
        name="mic"
        size={24}
        color={item.deviceId === currentDeviceId ? "#4CAF50" : "#666"}
      />
      <View style={styles.microphoneInfo}>
        <Text style={[
          styles.microphoneName,
          item.deviceId === currentDeviceId && styles.selectedText
        ]}>
          {item.label || `Microphone ${item.deviceId}`}
        </Text>
        {item.deviceId === currentDeviceId && (
          <Text style={styles.currentLabel}>Currently Selected</Text>
        )}
      </View>
      {item.deviceId === currentDeviceId && (
        <MaterialIcons name="check" size={20} color="#4CAF50" />
      )}
    </TouchableOpacity>
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
            <Text style={styles.title}>Select Microphone</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading microphones...</Text>
            </View>
          ) : (
            <FlatList
              data={availableMicrophones}
              renderItem={renderMicrophoneItem}
              keyExtractor={(item) => item.deviceId}
              style={styles.microphoneList}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  microphoneList: {
    maxHeight: 300,
  },
  microphoneItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  selectedMicrophone: {
    backgroundColor: "#e8f5e8",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  microphoneInfo: {
    flex: 1,
    marginLeft: 12,
  },
  microphoneName: {
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

export default MicrophoneSelector;
