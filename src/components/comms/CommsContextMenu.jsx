import React from "react";
import { useThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import useUserStore from "@/src/context/UserStore";
import ContextMenu from "@/src/components/features/contextMenu/ContextMenu";
import ContextMenuItem from "@/src/components/features/contextMenu/ContextMenuItem";
import Divider from "@/src/components/ui/divider/Divider";
import VolumeControl from "./VolumeControl";
import { useRouter } from "expo-router";
const MENU_WIDTH = 220;

const getUserUUIDFromDeviceUUID = (deviceUUID) => {
  if (!deviceUUID || deviceUUID === "watch-together") return null;
  return deviceUUID.split("_")[0];
};

const CommsContextMenu = ({
  visible,
  onClose,
  streamUUID,
  deviceUUID,
  displayName: propDisplayName,
  isScreenShare: propIsScreenShare,
  isLocal: propIsLocal,
  position,
  containerBounds = { x: 0, y: 0, width: 0, height: 0 },
}) => {
  const { theme } = useThemeContext();
  const router = useRouter();
  const getUser = useUserStore((state) => state.getUser);

  const {
    localMuted,
    toggleLocalMute,
    setShowWatchTogetherModal,
    pinnedStreamUUID,
    setPinnedStreamUUID,
    fullscreenStreamUUID,
    setFullScreenStreamUUID,
    streams,
  } = useCommsContext();

  const [activeStream, setActiveStream] = React.useState(null);

  React.useEffect(() => {
    if (visible && streamUUID) {
      setActiveStream({
        streamUUID,
        deviceUUID,
        displayName: propDisplayName,
        isScreenShare: propIsScreenShare,
        isLocal: propIsLocal,
        position,
      });
      return;
    }

    if (!visible) {
      setActiveStream(null);
    }
  }, [
    visible,
    streamUUID,
    deviceUUID,
    propDisplayName,
    propIsScreenShare,
    propIsLocal,
    position,
  ]);

  const displayData = activeStream || {
    streamUUID,
    deviceUUID,
    displayName: propDisplayName,
    isScreenShare: propIsScreenShare,
    isLocal: propIsLocal,
    position,
  };

  const {
    streamUUID: activeStreamUUID,
    deviceUUID: activeDeviceUUID,
    displayName,
    isScreenShare,
    isLocal,
  } = displayData;

  const volKey = isScreenShare ? activeStreamUUID : activeDeviceUUID;
  const isWatchTogether =
    activeDeviceUUID === "watch-together" &&
    activeStreamUUID === "watch-together";

  const isCurrentlyPinned = pinnedStreamUUID === activeStreamUUID;
  const isCurrentlyFullScreen = fullscreenStreamUUID === activeStreamUUID;

  const activeStreamObj = streams[activeStreamUUID];
  const streamActive = activeStreamObj && activeStreamObj.active;

  const showPinButton =
    ((streamActive && !isLocal) || isWatchTogether) && !isCurrentlyFullScreen;
  const showFullscreenButton = (streamActive && !isLocal) || isWatchTogether;

  const handlePinPress = () => {
    setPinnedStreamUUID((prev) =>
      prev === activeStreamUUID ? null : activeStreamUUID,
    );
    onClose();
  };

  const handleFullScreenPress = () => {
    setFullScreenStreamUUID((prev) =>
      prev === activeStreamUUID ? null : activeStreamUUID,
    );
    onClose();
  };

  const isMuted = localMuted[volKey] ?? false;
  const estimatedHeight = isLocal ? 150 : 320;

  const userUUID = getUserUUIDFromDeviceUUID(activeDeviceUUID);
  const user = userUUID ? getUser(userUUID) : null;

  const handleProfilePress = () => {
    if (!user?.handle) return;
    onClose();
    router.navigate(`/profile/${user.handle}`);
  };

  return (
    <ContextMenu
      visible={visible}
      onClose={onClose}
      position={displayData.position}
      containerBounds={containerBounds}
      width={MENU_WIDTH}
      estimatedHeight={estimatedHeight}
    >
      <ContextMenuItem
        iconName={"UserIcon"}
        iconColor={isMuted ? theme.dangerText : undefined}
        text={displayName}
        onPress={handleProfilePress}
      />

      <Divider />

      {isLocal === false && (
        <ContextMenuItem
          iconName={isMuted ? "MicOff01Icon" : "Mic01Icon"}
          iconColor={isMuted ? theme.dangerText : undefined}
          text={isMuted ? "Unmute" : "Mute"}
          variant={isMuted ? "danger" : "default"}
          onPress={() => toggleLocalMute(volKey)}
        />
      )}

      {isLocal === false && (
        <VolumeControl volKey={volKey} isScreenShare={isScreenShare} />
      )}

      {showPinButton && (
        <ContextMenuItem
          iconName={isCurrentlyPinned ? "PinOffIcon" : "PinIcon"}
          translationKey={
            isCurrentlyPinned ? "chat.comms.unpin" : "chat.comms.pin"
          }
          onPress={handlePinPress}
        />
      )}

      {showFullscreenButton && (
        <ContextMenuItem
          iconName={
            isCurrentlyFullScreen ? "ArrowShrink01Icon" : "ArrowExpand01Icon"
          }
          translationKey={
            isCurrentlyFullScreen
              ? "chat.comms.exitFullscreen"
              : "chat.comms.fullscreen"
          }
          onPress={handleFullScreenPress}
        />
      )}

      <ContextMenuItem
        iconName="Settings02Icon"
        translationKey={
          isWatchTogether ? "chat.comms.watchTogether.modify" : undefined
        }
        text={isWatchTogether ? undefined : "Actions (WIP)"}
        onPress={() => {
          onClose();
          if (isWatchTogether) {
            setShowWatchTogetherModal(true);
          }
        }}
      />

      {!isWatchTogether && (
        <ContextMenuItem
          iconName="InformationCircleIcon"
          text="Info (WIP)"
          onPress={() => {}}
        />
      )}
    </ContextMenu>
  );
};

export default CommsContextMenu;
