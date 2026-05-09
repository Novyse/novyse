import React from "react";
import { View, Pressable, StyleSheet, Dimensions, Modal } from "react-native";
import AppText from "@/src/components/AppText";

import { useThemeContext } from "@/context/ThemeContext";
import { useCommsContext } from "@/context/CommsContext";
import HoverAndPressedButton from "../HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import BlurredView from "../BlurredView";
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
}) => {
  const { theme } = useThemeContext();
  const { localMuted, toggleLocalMute } = useCommsContext();
  const styles = createStyles(theme);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

  const menuWidth = 220;
  const menuHeight = isLocal ? 150 : 250;

  let adjustedX = displayData.position?.x || 0;
  let adjustedY = displayData.position?.y || 0;

  if (adjustedX + menuWidth > screenWidth) {
    adjustedX = screenWidth - menuWidth - 10;
  }
  if (adjustedX < 10) {
    adjustedX = 10;
  }

  if (adjustedY + menuHeight > screenHeight) {
    adjustedY = adjustedY - menuHeight;
    if (adjustedY < 10) {
      adjustedY = 10;
    }
  }

  const isMuted = localMuted[volKey] ?? false;

  const handleMutePress = () => {
    toggleLocalMute(volKey);
  };

  if (!activeStream && !visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          // @ts-ignore
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
        <View
          pointerEvents="box-none"
          style={[styles.wrapper, { top: adjustedY, left: adjustedX }]}
        >
          <BlurredView style={styles.menuContainer}>
            <View style={styles.header}>
              <AppText
                style={styles.title}
                text={displayName}
                numberOfLines={1}
              />
              {isScreenShare && (
                <AppText style={styles.subtitle} text="Screen Share" />
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
                      color={isMuted ? "red" : theme.text}
                    />
                    <AppText
                      style={[styles.menuText, isMuted && { color: "red" }]}
                      text={isMuted ? "Unmute" : "Mute"}
                    />
                  </View>
                </HoverAndPressedButton>
              )}

              {/* Volume Slider Section */}
              {isLocal === false && (
                <VolumeControl
                  volKey={volKey}
                  isScreenShare={isScreenShare}
                />
              )}

              {/* WIP Buttons */}
              <HoverAndPressedButton style={styles.menuItem} onPress={() => {}}>
                <View style={styles.menuItemContent}>
                  <Icon name="Settings02Icon" size={20} color={theme.text} />
                  <AppText style={styles.menuText} text="Actions (WIP)" />
                </View>
              </HoverAndPressedButton>

              <HoverAndPressedButton style={styles.menuItem} onPress={() => {}}>
                <View style={styles.menuItemContent}>
                  <Icon
                    name="InformationCircleIcon"
                    size={20}
                    color={theme.text}
                  />
                  <AppText style={styles.menuText} text="Info (WIP)" />
                </View>
              </HoverAndPressedButton>
            </View>
          </BlurredView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
    overlay: {
      flex: 1,
    },
    wrapper: {
      position: "absolute",
      zIndex: 1000,
      width: 220,
    },
    menuContainer: {
      borderRadius: 12,
      padding: 10,
      zIndex: 1000,
      overflow: "hidden",
    },
    header: {
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.1)",
      marginBottom: 5,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    subtitle: {
      fontSize: 12,
      color: theme.text,
      opacity: 0.6,
    },
    menuColumn: {
      flexDirection: "column",
      gap: 5,
    },
    menuItem: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    menuText: {
      fontSize: 14,
      color: theme.text,
    },
  });

export default CommsMenu;
