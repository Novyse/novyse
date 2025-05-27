import React, { useContext, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import VocalBottomBarButton from "./VocalBottomBarButton";
import voiceActivityDetection from "../utils/voiceActivityDetection";

import utils from "../utils/webrtc/utils";
const { self, handle, check, get } = utils;


const VocalContentBottomBar = ({ chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // SETTINGS PARTE 2
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinVocal = async () => {
    try {
      setIsLoading(true);
      await self.join(chatId);

    } catch (error) {
      console.error("Error joining comms:", error);
      alert(
        "Could not join comms."
      );
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
    try {
      console.log('[ScreenShare] Starting screen share, Platform:', Platform.OS);
      const result = await WebRTC.addScreenShareStream();
      if (result) {
        console.log(`[ScreenShare] Screen share started with ID: ${result.streamId}`);
      } else {
        console.warn('[ScreenShare] Failed to start screen share');
        if (Platform.OS === 'android') {
          alert('Screen sharing failed. Please ensure camera and microphone permissions are granted, and try again.');
        } else {
          alert('Failed to start screen share. Please try again.');
        }
      }
    } catch (error) {
      console.error('[ScreenShare] Error starting screen share:', error);
      
      // Provide specific error messages for different scenarios
      let errorMessage = 'Error starting screen share: ';
      if (Platform.OS === 'android') {
        if (error.message.includes('Permission')) {
          errorMessage += 'Camera permission required for screen sharing on Android. Please grant camera access and try again.';
        } else if (error.message.includes('not available')) {
          errorMessage += 'Screen sharing not supported on this Android device. Camera will be used as fallback.';
        } else {
          errorMessage += `Android screen sharing error: ${error.message}`;
        }
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
          <VocalBottomBarButton
            onPress={toggleAudio}
            iconName={isAudioEnabled ? "mic" : "mic-off"}
            iconColor={theme.icon}
          />
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
