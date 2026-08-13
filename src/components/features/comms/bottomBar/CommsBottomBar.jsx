import { useContext, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

import { router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";

import MicrophoneSelector from "@/src/components/features/comms/bottomBar/MicrophoneSelector";
import CameraSelector from "@/src/components/features/comms/bottomBar/CameraSelector";
import CameraArrowButton from "@/src/components/features/comms/bottomBar/CameraArrowButton";
import SpeakerSelector from "@/src/components/features/comms/bottomBar/SpeakerSelector";
import ScreenShareSelector from "@/src/components/features/comms/bottomBar/ScreenShareSelector";
import StatusMessage from "@/src/components/features/status/StatusMessage";

import BlurredView from "@/src/components/layout/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";

import useCommsAction from "@/src/hooks/comms/useCommsAction";
import { useCommsContext } from "@/src/context/CommsContext";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";
import useUserStore from "@/src/store/UserStore";
import useChatStore from "@/src/store/ChatStore";
import { hasPermission, PERMISSIONS } from "@/src/utils/chat/permissions";

import { getPlatform } from "@/src/utils/device/type";
import { RoomOptionsMenu } from "@/src/components/features/comms/bottomBar/RoomOptionsMenu";
import { WatchTogetherModal } from "@/src/components/features/comms/bottomBar/WatchTogetherModal";
import SpeakerArrowButton from "@/src/components/features/comms/bottomBar/SpeakerArrowButton";
import MicrophoneArrowButton from "@/src/components/features/comms/bottomBar/MicrophoneArrowButton";

const CommsBottomBar = ({ chatUUID, sub }) => {
  const { theme } = useContext(ThemeContext);
  const platform = getPlatform();
  const isDesktop = platform === "desktop";
  const isMobile = platform === "mobile";
  const showDeviceSelectors = isDesktop || platform === "web";
  const showMicrophoneSelectorUI = showDeviceSelectors;
  const showSpeakerOutputSelector = isDesktop;
  const showMobileAudioInRoomMenu = isMobile;
  const styles = createStyle(theme, isDesktop);

  const [showMicrophoneSelector, setShowMicrophoneSelector] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [showSpeakerSelector, setShowSpeakerSelector] = useState(false);
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
    speakerDevice,
    activeScreenShares,
    join,
    leave,
    toggleAudio,
    toggleAudioOutput,
    toggleVideo,
    toggleFacingMode,
    setMicrophoneDevice,
    setCameraDevice,
    setSpeakerDevice,
    startScreenShare,
    stopScreenShare,
    error,
    clearError,
  } = useCommsAction(chatUUID, sub);

  const myUUID = useUserStore((state) => state.localUserUUID);
  const activeChat = useActiveChatStore((state) => state.activeChatData);
  const chatFromStore = useChatStore((state) =>
    state.chats.find((c) => c.uuid === chatUUID || c.handle === chatUUID),
  );
  const chat = activeChat || chatFromStore;
  const myMember = chat?.members?.find(
    (m) => (m.uuid || m.userUUID) === myUUID,
  );
  const myRoleIDs =
    myMember?.roleIDs ||
    myMember?.role_ids ||
    myMember?.roleIds ||
    (myMember ? [2] : []);
  const myRoles = (chat?.roles || []).filter((r) =>
    myRoleIDs.some((id) => Number(r.id) === Number(id)),
  );
  const subType = chat?.subs?.find((s) => s.id === sub)?.type;
  const inVocalCall = connected && roomMatch;
  const canSpeak =
    inVocalCall || hasPermission(myRoles, PERMISSIONS.SPEAK_VOCAL, subType);
  const canVideo =
    inVocalCall || hasPermission(myRoles, PERMISSIONS.VIDEO_VOCAL, subType);
  const canScreenShare =
    inVocalCall ||
    hasPermission(myRoles, PERMISSIONS.SCREENSHARE_VOCAL, subType);

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
    if (showDeviceSelectors) setShowCameraSelector(true);
    else toggleFacingMode();
  };

  const handleSpeakerArrowPress = () => {
    if (showSpeakerOutputSelector) setShowSpeakerSelector(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusWrapper}>
        <StatusMessage
          type="danger"
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
        <BlurredView
          style={[
            styles.blurredContainer,
            isDesktop && styles.blurredContainerDesktop,
          ]}
        >
          {canSpeak && (
            <View style={styles.microphoneButtonContainer}>
              <Icon
                onPress={toggleAudio}
                name={isAudioEnabled ? "Mic02Icon" : "MicOff02Icon"}
                style={styles.icon}
              />
              {showMicrophoneSelectorUI && (
                <MicrophoneArrowButton
                  onPress={() => {
                    if (connected && roomMatch) setShowMicrophoneSelector(true);
                  }}
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

              {showDeviceSelectors ? (
                <CameraArrowButton
                  onPress={() => {
                    if (connected && roomMatch) handleCameraArrowPress();
                  }}
                />
              ) : (
                isMobile && (
                  <MicrophoneArrowButton
                    isMobile={isMobile}
                    onPress={() => {
                      if (connected && roomMatch) toggleFacingMode();
                    }}
                  />
                )
              )}
            </View>
          )}

          <View style={styles.speakerButtonContainer}>
            <Icon
              onPress={toggleAudioOutput}
              name={isAudioOutputEnabled ? "VolumeHighIcon" : "VolumeOffIcon"}
              style={styles.icon}
            />

            {showSpeakerOutputSelector && (
              <SpeakerArrowButton
                onPress={() => {
                  if (connected && roomMatch) handleSpeakerArrowPress();
                }}
              />
            )}
          </View>
          {canScreenShare && (
            <Icon
              onPress={() => {
                if (isDesktop) setShowScreenShareSelector(true);
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

      {showMicrophoneSelectorUI && (
        <MicrophoneSelector
          visible={showMicrophoneSelector}
          onClose={() => setShowMicrophoneSelector(false)}
          onMicrophoneSelected={(id) => setMicrophoneDevice(id)}
          currentDeviceId={microphoneDevice}
        />
      )}

      {showDeviceSelectors && (
        <CameraSelector
          visible={showCameraSelector}
          onClose={() => setShowCameraSelector(false)}
          onCameraSelected={(id) => setCameraDevice(id)}
          currentDeviceId={cameraDevice}
        />
      )}

      {showSpeakerOutputSelector && (
        <SpeakerSelector
          visible={showSpeakerSelector}
          onClose={() => setShowSpeakerSelector(false)}
          onSpeakerSelected={(id) => setSpeakerDevice(id)}
          currentDeviceId={speakerDevice}
        />
      )}

      <ScreenShareSelector
        visible={showScreenShareSelector}
        onClose={() => setShowScreenShareSelector(false)}
        onSourceSelected={startScreenShare}
      />

      <RoomOptionsMenu
        visible={showRoomMenu}
        onClose={() => setShowRoomMenu(false)}
        onOpenWatchTogether={() => setShowWatchTogetherModal(true)}
        showAudioOutput={showMobileAudioInRoomMenu && connected && roomMatch}
        speakerDevice={speakerDevice}
        onSpeakerSelected={(id) => setSpeakerDevice(id)}
      />

      <WatchTogetherModal
        visible={showWatchTogetherModal}
        onClose={() => setShowWatchTogetherModal(false)}
      />
    </View>
  );
};

const createStyle = (theme, isDesktop) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 30,
      alignSelf: "center",
      borderRadius: 30,
      height: 60,
      minWidth: isDesktop ? 280 : 200,
      maxWidth: isDesktop ? 520 : 360,
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
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    blurredContainerDesktop: {
      overflow: "visible",
    },
    microphoneButtonContainer: {
      position: "relative",
      flexShrink: 0,
      overflow: "visible",
      zIndex: 3,
    },
    cameraButtonContainer: {
      position: "relative",
      flexShrink: 0,
      overflow: "visible",
      zIndex: 3,
    },
    speakerButtonContainer: {
      position: "relative",
      flexShrink: 0,
      overflow: "visible",
      zIndex: 3,
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
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CommsBottomBar;
