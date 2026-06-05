import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";

import CommsBottomBarButton from "@/src/components/comms/BottomBar/Button";
import MicrophoneSelector from "@/src/components/comms/BottomBar/MicrophoneSelector";
import MicrophoneArrowButton from "@/src/components/comms/BottomBar/MicrophoneArrowButton";
import CameraSelector from "@/src/components/comms/BottomBar/CameraSelector";
import CameraArrowButton from "@/src/components/comms/BottomBar/CameraArrowButton";
import ScreenShareSelector from "@/src/components/comms/BottomBar/ScreenShareSelector";
import StatusMessage from "@/src/components/StatusMessage";

import BlurredView from "@/src/components/BlurredView";

import useCommsAction from "@/src/hooks/comms/useCommsAction";

import Platform from "@/src/utils/device/type";
import { RoomOptionsMenu } from "./RoomOptionsMenu";
import { WatchTogetherModal } from "./WatchTogetherModal";

const CommsBottomBar = ({ chatUUID, sub }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const isMobile = Platform === "mobile";

  const [showMicrophoneSelector, setShowMicrophoneSelector] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [showScreenShareSelector, setShowScreenShareSelector] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showWatchTogether, setShowWatchTogether] = useState(false);

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
      <View style={styles.statusWrapper}>
        <StatusMessage
          type="error"
          visible={!!error}
          content={[error]}
          onClose={clearError}
          timeout={5000}
        />
      </View>
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
              iconColor={theme.iconSuccess}
              hoverColor={theme.successText}
              style={{ width: 60, height: 60 }}
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
            onPress={() => {
              if (Platform === "desktop") setShowScreenShareSelector(true);
              else startScreenShare();
            }}
            iconName={"ComputerScreenShareIcon"}
          />
          <CommsBottomBarButton
            onPress={() => router.push("/app/settings/comms")}
            iconName={"Settings02Icon"}
          />
          <CommsBottomBarButton
            onPress={() => setShowRoomMenu(true)}
            iconName={"MoreVerticalIcon"}
          />
          <CommsBottomBarButton
            onPress={leave}
            iconName={"Call02Icon"}
            iconColor={theme.iconDanger}
            hoverColor={theme.dangerText}
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

      <ScreenShareSelector
        visible={showScreenShareSelector}
        onClose={() => setShowScreenShareSelector(false)}
        onSourceSelected={startScreenShare}
      />

      <RoomOptionsMenu
        visible={showRoomMenu}
        onClose={() => setShowRoomMenu(false)}
        onOpenWatchTogether={() => setShowWatchTogether(true)}
      />

      <WatchTogetherModal
        visible={showWatchTogether}
        onClose={() => setShowWatchTogether(false)}
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
      maxWidth: 360,
      zIndex: 100,
    },
    statusWrapper: {
      position: "absolute",
      bottom: 70,
      width: "100%",
      alignSelf: "center",
      zIndex: 200,
    },
    blurredContainer: {
      flex: 1,
      borderRadius: 40,
      width: "100%",
      height: "100%",
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      alignSelf: "center",
      padding: 5,
    },
    microphoneButtonContainer: {
      position: "relative",
    },
    cameraButtonContainer: {
      position: "relative",
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
