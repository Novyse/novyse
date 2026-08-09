import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { useThemeContext } from "@/src/context/ThemeContext";
import { useCommsContext } from "@/src/context/CommsContext";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "../layout/BlurredView";
import VolumeControl from "./VolumeControl";

const CommsMenu = ({
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
  const styles = createStyles(theme);

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

  const menuWidth = 220;
  const menuHeight = isLocal ? 150 : 320;
  const boundsWidth = containerBounds.width || 0;
  const boundsHeight = containerBounds.height || 0;

  let adjustedX = (displayData.position?.x || 0) - (containerBounds.x || 0);
  let adjustedY = (displayData.position?.y || 0) - (containerBounds.y || 0);

  if (boundsWidth > 0 && adjustedX + menuWidth > boundsWidth) {
    adjustedX = boundsWidth - menuWidth - 10;
  }
  if (adjustedX < 10) {
    adjustedX = 10;
  }

  if (boundsHeight > 0 && adjustedY + menuHeight > boundsHeight) {
    adjustedY = adjustedY - menuHeight;
    if (adjustedY < 10) {
      adjustedY = 10;
    }
  }

  const isMuted = localMuted[volKey] ?? false;

  const handleMutePress = () => {
    toggleLocalMute(volKey);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        // @ts-ignore
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <View style={[styles.wrapper, { top: adjustedY, left: adjustedX }]}>
        <BlurredView style={styles.menuContainer}>
          <View style={styles.header}>
            <Typography
              weight="semibold"
              text={displayName}
              numberOfLines={1}
            />
            {isScreenShare && (
              <Typography variant="subtitle" size="xs" text="Screen Share" />
            )}
          </View>

          <View style={styles.menuColumn}>
            {/* Mute Button */}
            {isLocal === false && (
              <HoverAndPressedButton
                style={styles.menuItem}
                onPress={handleMutePress}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={isMuted ? "MicOff01Icon" : "Mic01Icon"}
                    size={20}
                    color={isMuted ? theme.dangerText : theme.text}
                  />
                  <Typography
                    variant={isMuted ? "danger" : "default"}
                    size="sm"
                    text={isMuted ? "Unmute" : "Mute"}
                  />
                </View>
              </HoverAndPressedButton>
            )}

            {/* Volume Slider Section */}
            {isLocal === false && (
              <VolumeControl volKey={volKey} isScreenShare={isScreenShare} />
            )}

            {/* Pin Button */}
            {showPinButton && (
              <HoverAndPressedButton
                style={styles.menuItem}
                onPress={handlePinPress}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={isCurrentlyPinned ? "PinOffIcon" : "PinIcon"}
                    size={20}
                  />
                  <Typography
                    size="sm"
                    translationKey={
                      isCurrentlyPinned ? "chat.comms.unpin" : "chat.comms.pin"
                    }
                  />
                </View>
              </HoverAndPressedButton>
            )}

            {/* Fullscreen Button */}
            {showFullscreenButton && (
              <HoverAndPressedButton
                style={styles.menuItem}
                onPress={handleFullScreenPress}
              >
                <View style={styles.menuItemContent}>
                  <Icon
                    name={
                      isCurrentlyFullScreen
                        ? "ArrowShrink01Icon"
                        : "ArrowExpand01Icon"
                    }
                    size={20}
                  />
                  <Typography
                    size="sm"
                    translationKey={
                      isCurrentlyFullScreen
                        ? "chat.comms.exitFullscreen"
                        : "chat.comms.fullscreen"
                    }
                  />
                </View>
              </HoverAndPressedButton>
            )}

            {/* Actions Button */}
            <HoverAndPressedButton
              style={styles.menuItem}
              onPress={() => {
                onClose();
                if (isWatchTogether) {
                  setShowWatchTogetherModal(true);
                }
              }}
            >
              <View style={styles.menuItemContent}>
                <Icon name="Settings02Icon" size={20} />
                {isWatchTogether ? (
                  <Typography
                    size="sm"
                    translationKey="chat.comms.watchTogether.modify"
                  />
                ) : (
                  <Typography size="sm" text="Actions (WIP)" />
                )}
              </View>
            </HoverAndPressedButton>

            {/* Info Button */}
            {!isWatchTogether && (
              <HoverAndPressedButton style={styles.menuItem} onPress={() => {}}>
                <View style={styles.menuItemContent}>
                  <Icon name="InformationCircleIcon" size={20} />
                  <Typography size="sm" text="Info (WIP)" />
                </View>
              </HoverAndPressedButton>
            )}
          </View>
        </BlurredView>
      </View>
    </View>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      elevation: 1000,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    wrapper: {
      position: "absolute",
      zIndex: 1001,
      width: 220,
    },
    menuContainer: {
      borderRadius: 25,
      padding: 10,
      overflow: "hidden",
    },
    header: {
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
      marginBottom: 5,
    },
    menuColumn: {
      flexDirection: "column",
      gap: 5,
    },
    menuItem: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 25,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
  });

export default CommsMenu;
