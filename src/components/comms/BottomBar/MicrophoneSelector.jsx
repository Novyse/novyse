import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet, FlatList } from "react-native";
import { Platform } from "react-native";

import { Room } from "livekit-client";

import { useThemeContext } from "@/src/context/ThemeContext";

import ModalBase from "../../modalSheets/ModalBase";
import Icon from "@/src/components/Icon";
import AppText from "@/src/components/AppText";

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
        <Icon name={"Mic02Icon"} color={isSelected ? theme.iconSuccess : theme.text} />
        <View style={styles.microphoneInfo}>
          <AppText
            style={[styles.microphoneName, isSelected && styles.selectedText]}
          >
            {item.label ||
              t("chat.comms.selectors.microphone.defaultName", {
                id: item.deviceId,
              })}
          </AppText>
          {isSelected && (
            <AppText
              style={styles.currentLabel}
              translationKey="chat.comms.selectors.microphone.currentlySelected"
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
      color: theme.text,
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
      color: theme.text,
    },
    microphoneList: {
      maxHeight: 300,
      padding: 20,
      ...(Platform.OS === "web" && {
        // Standard per Firefox (fisso, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
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
      borderColor: theme.successText,
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
      color: theme.successText,
    },
    currentLabel: {
      fontSize: 12,
      color: theme.successText,
      marginTop: 2,
    },
  });
}

export default MicrophoneSelector;
