import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { Platform } from "react-native";

import { Room } from "livekit-client";

import { useThemeContext } from "@/context/ThemeContext";

import ModalBase from "@/src/components/modals/ModalBase";
import Icon from "@/src/components/Icon";

const MicrophoneSelector = ({
  visible,
  onClose,
  onMicrophoneSelected,
  currentDeviceId,
}) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

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
      const microphones = await Room.getLocalDevices("audioinput");
      setAvailableMicrophones(microphones);
    } catch (error) {
      console.error("Error loading microphones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrophoneSelect = (device) => {
    onMicrophoneSelected(device.deviceId);
    onClose();
  };

  const renderMicrophoneItem = ({ item }) => {
    const isSelected =
      item.deviceId === currentDeviceId ||
      (currentDeviceId === "default" &&
        item.deviceId === availableMicrophones[0]?.deviceId);
    return (
      <Pressable
        style={[styles.microphoneItem, isSelected && styles.selectedMicrophone]}
        onPress={() => handleMicrophoneSelect(item)}
      >
        <Icon name={"Mic02Icon"} color={isSelected ? "#4CAF50" : theme.text} />
        <View style={styles.microphoneInfo}>
          <Text
            style={[styles.microphoneName, isSelected && styles.selectedText]}
          >
            {item.label || `Microphone ${item.deviceId}`}
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
        <Text style={styles.title}>Select Microphone</Text>
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
    microphoneList: {
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
    microphoneItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.backgroundMainGradient[1],
    },
    selectedMicrophone: {
      backgroundColor: theme.backgroundMainGradient[1],
      borderWidth: 1,
      borderColor: "#4CAF50",
    },
    microphoneInfo: {
      flex: 1,
      marginLeft: 12,
    },
    microphoneName: {
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

export default MicrophoneSelector;
