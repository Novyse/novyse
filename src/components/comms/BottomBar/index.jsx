import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import CommsBottomBarButton from "@/src/components/comms/BottomBar/Button";
import MicrophoneSelector from "@/src/components/comms/BottomBar/MicrophoneSelector";
import MicrophoneArrowButton from "@/src/components/comms/BottomBar/MicrophoneArrowButton";
import CameraSelector from "@/src/components/comms/BottomBar/CameraSelector";
import CameraArrowButton from "@/src/components/comms/BottomBar/CameraArrowButton";
import StatusMessage from "@/src/components/StatusMessage";

import BlurredView from "@/src/components/BlurredView";

import useCommsAction from "@/src/hooks/comms/useCommsAction";

import Platform from "@/src/utils/device/type";

const CommsBottomBar = ({ chatUUID, sub, navigation }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const isMobile = Platform === "mobile";

  const [showMicrophoneSelector, setShowMicrophoneSelector] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);

  const {
    connecting,
    connected,
    roomMatch,
    isAudioEnabled,
    isVideoEnabled,
    microphoneDevice,
    cameraDevice,
    activeScreenShares,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleFacingMode,
    setMicrophoneDevice,
    setCameraDevice,
    startScreenShare,
    stopScreenShare,
    error,
    clearError,
  } = useCommsAction(chatUUID, sub);

  // Shortcut: Ctrl+F12 per mutare il microfono (solo web)
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "F12") {
        e.preventDefault();
        toggleAudio();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAudioEnabled]);

  const handleCameraArrowPress = () => {
    if (!isMobile) setShowCameraSelector(true);
    else toggleFacingMode();
  };

  return (
    <View style={styles.container}>
      <StatusMessage
        type="error"
        visible={!!error}
        content={[error]}
        onClose={clearError}
        timeout={5000}
      />

      {!connected || !roomMatch ? (
        connecting ? (
          <BlurredView style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </BlurredView>
        ) : (
          <BlurredView style={styles.iconButton}>
            <CommsBottomBarButton
              onPress={join}
              iconName={"Call02Icon"}
              iconColor="green"
              hoverColor={theme.iconCommsInHover}
            />
          </BlurredView>
        )
      ) : (
        <BlurredView style={styles.blurredContainer}>
          <View style={styles.microphoneButtonContainer}>
            <CommsBottomBarButton
              onPress={toggleAudio}
              iconName={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
            />
            {!isMobile && (
              <MicrophoneArrowButton
                onPress={() => {
                  if (connected && roomMatch) setShowMicrophoneSelector(true);
                }}
                theme={theme}
              />
            )}
          </View>
          <View style={styles.cameraButtonContainer}>
            <CommsBottomBarButton
              onPress={toggleVideo}
              iconName={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
            />

            <CameraArrowButton
              onPress={() => {
                if (connected && roomMatch) handleCameraArrowPress();
              }}
              theme={theme}
            />
          </View>
          <CommsBottomBarButton
            onPress={startScreenShare}
            iconName={"ComputerScreenShareIcon"}
          />
          <CommsBottomBarButton
            onPress={() => navigation.navigate("comms")}
            iconName={"Settings02Icon"}
          />
          <CommsBottomBarButton
            onPress={leave}
            iconName={"Call02Icon"}
            iconColor="red"
            hoverColor={theme.iconCommsOutHover}
          />
        </BlurredView>
      )}

      <MicrophoneSelector
        visible={showMicrophoneSelector}
        onClose={() => setShowMicrophoneSelector(false)}
        onMicrophoneSelected={(id) => setMicrophoneDevice(id)}
        currentDeviceId={microphoneDevice}
      />

      <CameraSelector
        visible={showCameraSelector}
        onClose={() => setShowCameraSelector(false)}
        onCameraSelected={(id) => setCameraDevice(id)}
        currentDeviceId={cameraDevice}
      />
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 30,
      alignSelf: "center",
      borderRadius: 30,
      height: 60,
      minWidth: 200,
      maxWidth: 300,
    },
    blurredContainer: {
      flex: 1,
      borderRadius: 40,
      width: "100%",
      height: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      alignSelf: "center",
      padding: 5,
    },
    tabButton: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    activeTab: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: 30,
      width: "50%",
      height: "100%",
    },
    microphoneButtonContainer: {
      position: "relative",
      flex: 1,
    },
    cameraButtonContainer: {
      position: "relative",
      flex: 1,
    },
    iconButton: {
      position: "absolute",
      bottom: 5,
      height: 60,
      width: 60,
      borderRadius: 999,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CommsBottomBar;
