import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import VocalBottomBarButton from "./VocalBottomBarButton";
import MicrophoneSelector from "./MicrophoneSelector";
import MicrophoneArrowButton from "./MicrophoneArrowButton";

import utils from "../utils/webrtc/utils";
const { self, check } = utils;

const VocalContentBottomBar = ({ chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // SETTINGS PARTE 2
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMicrophoneSelector, setShowMicrophoneSelector] = useState(false);
  const [currentMicrophoneId, setCurrentMicrophoneId] = useState(null);

  const handleJoinVocal = async () => {
    try {
      setIsLoading(true);
      await self.join(chatId);
    } catch (error) {
      console.error("Error joining comms:", error);
      alert("Could not join comms.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = async () => {
    setIsAudioEnabled(await self.toggleAudio());
  };

  const toggleVideo = async () => {
    setIsVideoEnabled(await self.toggleVideo());
  };

  const handleScreenShare = async () => {
    await self.addScreenShare();
  };

  const handleMicrophoneSelect = () => {
    if (check.isInComms()) {
      setShowMicrophoneSelector(true);
    }
  };

  const handleMicrophoneChange = async (deviceId) => {
    try {
      await self.switchMicrophone(deviceId);
      setCurrentMicrophoneId(deviceId);
    } catch (error) {
      console.error("Failed to switch microphone:", error);
      Alert.alert(
        "Microphone Error",
        "Failed to switch microphone. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      {!check.isInComms() ? (
        isLoading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : (
          <VocalBottomBarButton
            onPress={handleJoinVocal}
            iconName="phone"
            iconColor="green"
          />
        )
      ) : (        
      <View style={styles.container}>
          <View style={styles.microphoneButtonContainer}>
            <VocalBottomBarButton
              onPress={toggleAudio}
              iconName={isAudioEnabled ? "mic" : "mic-off"}
              iconColor={theme.icon}
            />
            <MicrophoneArrowButton
              onPress={handleMicrophoneSelect}
              theme={theme}
            />
          </View>
          <VocalBottomBarButton
            onPress={toggleVideo}
            iconName={isVideoEnabled ? "videocam" : "videocam-off"}
            iconColor={theme.icon}
          />
          <VocalBottomBarButton
            onPress={handleScreenShare}
            iconName="desktop-windows"
            iconColor={theme.icon}
          />
          <VocalBottomBarButton
            onPress={async () => {
              self.left(chatId);
              setIsVideoEnabled(false); //TEMPORARY, NEED TO BE FIXED WITH SETTINGS (dette settinghe in italiano)
              setIsAudioEnabled(true);
            }}
            iconName="phone"
            iconColor="red"
          />
        </View>
      )}      
      {showMicrophoneSelector && (
        <MicrophoneSelector
          visible={showMicrophoneSelector}
          onClose={() => setShowMicrophoneSelector(false)}
          onMicrophoneSelected={handleMicrophoneChange}
          currentDeviceId={currentMicrophoneId}
        />
      )}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 15,
    },
    microphoneButtonContainer: {
      position: "relative",
    },
    iconButton: {
      backgroundColor: "rgba(0, 0, 0, 0.65)",
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default VocalContentBottomBar;
