import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";

import MicrophoneSelector from "@/src/components/comms/BottomBar/MicrophoneSelector";
import MicrophoneArrowButton from "@/src/components/comms/BottomBar/MicrophoneArrowButton";
import CameraSelector from "@/src/components/comms/BottomBar/CameraSelector";
import CameraArrowButton from "@/src/components/comms/BottomBar/CameraArrowButton";
import ScreenShareSelector from "@/src/components/comms/BottomBar/ScreenShareSelector";
import StatusMessage from "@/src/components/features/status/StatusMessage";

import BlurredView from "@/src/components/layout/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import { useCommsContext } from "@/src/context/CommsContext";
import useUserStore from "@/src/context/UserContext";
import useChatStore from "@/src/context/ChatContext";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";

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
  const { showWatchTogetherModal, setShowWatchTogetherModal } =
    useCommsContext();

  const {
    connecting,
    connected,
    roomMatch,
    isAudioEnabled,
    isAudioOutputEnabled,
    isVideoEnabled,
    microphoneDevice,
    cameraDevice,
    activeScreenShares,
    join,
    leave,
    toggleAudio,
    toggleAudioOutput,
    toggleVideo,
    toggleFacingMode,
    setMicrophoneDevice,
    setCameraDevice,
    startScreenShare,
    stopScreenShare,
    error,
    clearError,
  } = useCommsAction(chatUUID, sub);

  const myUUID = useUserStore((state) => state.localUserUUID);
  const chat = useChatStore((state) =>
    state.chats.find((c) => c.uuid === chatUUID),
  );
  const myMember = chat?.members?.find(
    (m) => (m.uuid || m.userUUID) === myUUID,
  );
  const myRoleIDs = myMember?.roleIDs || [];
  const myRoles = (chat?.roles || []).filter((r) =>
    myRoleIDs.some((id) => Number(r.id) === Number(id)),
  );
  const canSpeak = hasPermission(myRoles, PERMISSIONS.SPEAK_VOCAL, sub?.type);
  const canVideo = hasPermission(myRoles, PERMISSIONS.VIDEO_VOCAL, sub?.type);
  const canScreenShare = hasPermission(
    myRoles,
    PERMISSIONS.SCREENSHARE_VOCAL,
    sub?.type,
  );

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
          <BlurredView style={styles.joinIconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </BlurredView>
        ) : (
          <BlurredView style={styles.joinIconButton}>
            <Icon
              onPress={() => join()}
              name={"Call02Icon"}
              color={theme.iconSuccess}
              hoverColor={theme.successText}
              style={[styles.icon, { width: 60, height: 60 }]}
            />
          </BlurredView>
        )
      ) : (
        <BlurredView style={styles.blurredContainer}>
          {canSpeak && (
            <View style={styles.microphoneButtonContainer}>
              <Icon
                onPress={toggleAudio}
                name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                style={styles.icon}
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
          )}
          {canVideo && (
            <View style={styles.cameraButtonContainer}>
              <Icon
                onPress={toggleVideo}
                name={isVideoEnabled ? "Video02Icon" : "VideoOffIcon"}
                style={styles.icon}
              />

              <CameraArrowButton
                onPress={() => {
                  if (connected && roomMatch) handleCameraArrowPress();
                }}
                theme={theme}
              />
            </View>
          )}
          <Icon
            onPress={toggleAudioOutput}
            name={isAudioOutputEnabled ? "VolumeHighIcon" : "VolumeOffIcon"}
            style={styles.icon}
          />
          {canScreenShare && (
            <Icon
              onPress={() => {
                if (Platform === "desktop") setShowScreenShareSelector(true);
                else startScreenShare();
              }}
              name={"ComputerScreenShareIcon"}
              style={styles.icon}
            />
          )}
          <Icon
            onPress={() => router.push("/app/settings/comms")}
            name={"Settings02Icon"}
            style={styles.icon}
          />
          <Icon
            onPress={() => setShowRoomMenu(true)}
            name={"MoreVerticalIcon"}
            style={styles.icon}
          />
          <Icon
            onPress={leave}
            name={"Call02Icon"}
            color={theme.iconDanger}
            hoverColor={theme.dangerText}
            style={styles.icon}
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
        onOpenWatchTogether={() => setShowWatchTogetherModal(true)}
      />

      <WatchTogetherModal
        visible={showWatchTogetherModal}
        onClose={() => setShowWatchTogetherModal(false)}
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
    joinIconButton: {
      position: "absolute",
      bottom: 5,
      height: 60,
      width: 60,
      borderRadius: 999,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CommsBottomBar;
