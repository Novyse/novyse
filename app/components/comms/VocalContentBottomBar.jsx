import React, { useContext, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import VocalBottomBarButton from "./VocalBottomBarButton";
import MicrophoneSelector from "./MicrophoneSelector";
import MicrophoneArrowButton from "./MicrophoneArrowButton";
import CameraSelector from "./CameraSelector";
import CameraArrowButton from "./CameraArrowButton";
import { BlurView } from "expo-blur";

import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Mic02Icon,
  MicOff02Icon,
  Video02Icon,
  VideoOffIcon,
  ComputerScreenShareIcon,
  ComputerRemoveIcon,
  Call02Icon,
} from "@hugeicons/core-free-icons";

import methods from "../../utils/webrtc/methods";
const { get, self, check } = methods;

const VocalContentBottomBar = ({ chatId }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [isAudioEnabled, setIsAudioEnabled] = useState(get.microphoneStatus());
  const [isVideoEnabled, setIsVideoEnabled] = useState(get.videoStatus());
  const [isLoading, setIsLoading] = useState(false); // State for microphone and camera selectors
  const [showMicrophoneSelector, setShowMicrophoneSelector] = useState(false);
  const [currentMicrophoneId, setCurrentMicrophoneId] = useState(null);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  // State for mobile camera facing mode and preferences
  const [currentFacingMode, setCurrentFacingMode] = useState("user"); // 'user' for front, 'environment' for back
  const [pendingCameraPreferences, setPendingCameraPreferences] =
    useState(null); // Store camera preferences when video is off

  const handleJoinVocal = async () => {
    try {
      setIsLoading(true);

      // Update current status from settings
      setIsAudioEnabled(get.microphoneStatus());
      setIsVideoEnabled(get.videoStatus());

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
    const newVideoState = await self.toggleVideo();
    setIsVideoEnabled(newVideoState);

    // If video was just enabled and we have pending camera preferences, apply them
    if (newVideoState && pendingCameraPreferences) {
      try {
        if (Platform.OS !== "web") {
          // Mobile: apply facingMode preference
          const constraints = {
            video: {
              facingMode: { exact: pendingCameraPreferences.facingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              aspectRatio: { ideal: 16 / 9 },
            },
          };
          await self.switchMobileCamera(
            constraints,
            pendingCameraPreferences.facingMode
          );
          setCurrentFacingMode(pendingCameraPreferences.facingMode);
        } else {
          // Web: apply deviceId preference
          if (pendingCameraPreferences.deviceId) {
            await self.switchCamera(pendingCameraPreferences.deviceId);
            setCurrentCameraId(pendingCameraPreferences.deviceId);
          }
        }
        setPendingCameraPreferences(null); // Clear preferences after applying
      } catch (error) {
        console.error("Failed to apply pending camera preferences:", error);
      }
    }
  };
  const handleScreenShare = async () => {
    try {
      const result = await self.addScreenShare();
      if (result === null) {
        // Permission was denied, do nothing (stay in previous state)
        console.log(
          "Screen share permission denied - staying in current state"
        );
      }
      // If result is truthy, screen share started successfully
    } catch (error) {
      console.error("Error starting screen share:", error);
      // Handle other errors if needed, but permission denial is already handled
    }
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
  const handleCameraSelect = () => {
    console.log(
      `Camera select pressed - Platform: ${Platform.OS}, Video enabled: ${isVideoEnabled}`
    );
    if (check.isInComms()) {
      if (Platform.OS !== "web") {
        // Mobile: switch between front/back cameras
        handleMobileCameraSwitch();
      } else {
        // Web: show camera selector modal
        setShowCameraSelector(true);
      }
    }
  };
  const handleMobileCameraSwitch = async () => {
    try {
      // Toggle between front and back camera
      const newFacingMode =
        currentFacingMode === "user" ? "environment" : "user";
      const cameraName = newFacingMode === "user" ? "Front" : "Back";

      if (!isVideoEnabled) {
        // Video is disabled, just save the preference for later
        setPendingCameraPreferences({ facingMode: newFacingMode });
        setCurrentFacingMode(newFacingMode);
        console.log(
          `Camera preference saved: ${newFacingMode} (video disabled)`
        );

        Alert.alert(
          "Camera Preference Saved",
          `${cameraName} camera will be used when video is enabled.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Video is enabled, apply the change immediately
      const constraints = {
        video: {
          facingMode: { exact: newFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16 / 9 },
        },
      };
      const result = await self.switchMobileCamera(constraints, newFacingMode);
      if (result === false) {
        // Permission was denied or switch failed, do nothing
        console.log(
          "Mobile camera switch failed or permission denied - staying in current state"
        );
        return;
      }
      setCurrentFacingMode(newFacingMode);
    } catch (error) {
      console.error("Failed to switch mobile camera:", error);
      Alert.alert("Camera Error", "Failed to switch camera. Please try again.");
    }
  };
  const handleCameraChange = async (deviceId) => {
    try {
      if (!isVideoEnabled) {
        // Video is disabled, just save the preference for later
        setPendingCameraPreferences({ deviceId });
        setCurrentCameraId(deviceId);
        console.log(
          `Camera device preference saved: ${deviceId} (video disabled)`
        );
        return;
      } // Video is enabled, apply the change immediately
      const result = await self.switchCamera(deviceId);
      if (result === false) {
        // Permission was denied or switch failed, do nothing
        console.log(
          "Camera switch failed or permission denied - staying in current state"
        );
        return;
      }
      setCurrentCameraId(deviceId);
    } catch (error) {
      console.error("Failed to switch camera:", error);
      Alert.alert("Camera Error", "Failed to switch camera. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {!check.isInComms() || get.commsId() !== chatId ? (
        isLoading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : (
          <VocalBottomBarButton
            onPress={handleJoinVocal}
            iconName={Call02Icon}
            iconColor="green"
          />
        )
      ) : (
        <BlurView intensity={30} tint="light" style={styles.blurContainer}>
          <View style={styles.container}>
            <View style={styles.microphoneButtonContainer}>
              <VocalBottomBarButton
                onPress={toggleAudio}
                iconName={isAudioEnabled ? Mic02Icon : MicOff02Icon}
                iconColor={theme.icon}
              />
              <MicrophoneArrowButton
                onPress={handleMicrophoneSelect}
                theme={theme}
              />
            </View>
            <View style={styles.cameraButtonContainer}>
              <VocalBottomBarButton
                onPress={toggleVideo}
                iconName={isVideoEnabled ? Video02Icon : VideoOffIcon}
                iconColor={theme.icon}
              />
              <CameraArrowButton onPress={handleCameraSelect} theme={theme} />
            </View>
            <VocalBottomBarButton
              onPress={handleScreenShare}
              iconName={ComputerScreenShareIcon}
              iconColor={theme.icon}
            />
            <VocalBottomBarButton
              onPress={async () => {
                self.left(chatId);
              }}
              iconName={Call02Icon}
              iconColor="red"
            />
          </View>
        </BlurView>
      )}
      {showMicrophoneSelector && (
        <MicrophoneSelector
          visible={showMicrophoneSelector}
          onClose={() => setShowMicrophoneSelector(false)}
          onMicrophoneSelected={handleMicrophoneChange}
          currentDeviceId={currentMicrophoneId}
        />
      )}
      {showCameraSelector && Platform.OS === "web" && (
        <CameraSelector
          visible={showCameraSelector}
          onClose={() => setShowCameraSelector(false)}
          onCameraSelected={handleCameraChange}
          currentDeviceId={currentCameraId}
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
    cameraButtonContainer: {
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
    blurContainer: {
      padding: 10,
      textAlign: "center",
      justifyContent: "center",
      borderRadius: 20,
    },
  });

export default VocalContentBottomBar;
