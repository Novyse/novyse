import React, { memo, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";

import UserProfileAvatar from "./UserProfileAvatar";
import BlurredView from "../BlurredView";
import Icon from "../Icon";

let RTCView;
if (Platform.OS === "web") {
  RTCView = require("react-native-webrtc-web-shim").RTCView;
} else {
  RTCView = require("@livekit/react-native-webrtc").RTCView;
}

const UserCard = memo(
  ({
    deviceUUID,
    streamUUID,
    stream = null,
    displayName,
    profilePictureUUID,
    isLocal = false,
    isScreenShare = false,
    isPinned = false,
    isFullScreen = false,
    onPin,
    onFullScreen,
    stopScreenShare,
    width,
    height,
    margin,
    isSpeaking,
  }) => {
    const speakingOverlayStyle = useMemo(() => {
      const baseStyle = [styles.speakingOverlayContainer];

      if (isScreenShare || !isSpeaking) {
        return baseStyle;
      }

      baseStyle.push(styles.speakingOverlay);

      if (Platform.OS === "web") {
        baseStyle.push({
          animationName: "pulse-speaking",
          animationDuration: "1.5s",
          animationIterationCount: "infinite",
        });
      }

      return baseStyle;
    }, [isScreenShare, isSpeaking]);

    const hasControls =
      (stream && stream.active && !isLocal) || (isScreenShare && isLocal);

    return (
      <View
        style={[
          styles.profile,
          {
            width,
            height,
            margin: margin / 2,
          },
          isFullScreen && styles.fullscreenContainer,
        ]}
      >
        {hasControls && (
          <View style={styles.controlsContainer}>
            <BlurredView style={styles.controlsBlurred}>
              <View style={styles.controlsRow}>
                {stream && stream.active && !isLocal && !isFullScreen && (
                  <Icon
                    name={!isPinned ? "PinIcon" : "PinOffIcon"}
                    size={20}
                    color="white"
                    onPress={() => onPin(streamUUID)}
                  />
                )}
                {stream && stream.active && !isLocal && (
                  <Icon
                    name={
                      !isFullScreen ? "ArrowExpand01Icon" : "ArrowShrink01Icon"
                    }
                    size={20}
                    color="white"
                    onPress={() => onFullScreen(streamUUID)}
                  />
                )}
                {isScreenShare && isLocal && (
                  <Icon
                    name="ComputerRemoveIcon"
                    size={20}
                    color="white"
                    onPress={() => stopScreenShare(streamUUID)}
                  />
                )}
              </View>
            </BlurredView>
          </View>
        )}

        <View style={styles.videoContainer}>
          <VideoContent
            streamUUID={streamUUID}
            stream={stream}
            isLocal={isLocal}
            displayName={displayName}
            profilePictureUUID={profilePictureUUID}
            width={width}
            height={height}
          />
          <View style={speakingOverlayStyle} />
        </View>
      </View>
    );
  },
);

const VideoContent = memo(
  ({
    streamUUID,
    stream,
    isLocal,
    displayName,
    profilePictureUUID,
    width,
    height,
  }) => {
    const streamActive =
      stream && stream.getVideoTracks().some((track) => track.enabled);
    return (
      <View style={styles.videoContainer}>
        {streamActive ? (
          <RTCView
            key={streamUUID}
            stream={stream}
            style={[styles.videoStream, { objectFit: "cover" }]}
            muted={isLocal}
          />
        ) : (
          <UserProfileAvatar
            userHandle={displayName}
            profilePictureUUID={profilePictureUUID}
            containerWidth={width}
            containerHeight={height}
          />
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  profile: {
    backgroundColor: "transparent",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  controlsContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 20,
  },
  controlsBlurred: {
    margin: 5,
    borderRadius: 40,
    overflow: "hidden",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 5,
  },
  controlButton: {
    marginLeft: 5,
    padding: 5,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  fullscreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 1,
  },
  speakingOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    pointerEvents: "none",
    zIndex: 10,
    borderWidth: 0,
    borderColor: "transparent",
    opacity: 0,
  },
  speakingOverlay: {
    borderWidth: 2,
    borderColor: "#00FF00",
    opacity: 1,
    ...(Platform.OS === "web" && {
      boxShadow:
        "inset 0 0 15px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.6)",
    }),
    ...(Platform.OS === "ios" && {
      shadowColor: "#00FF00",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 8,
    }),
    // Android: solo bordo semplice, nessun effetto shadow/elevation
    ...(Platform.OS === "android" &&
      {
        // Nessun effetto aggiuntivo per Android
      }),
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderRadius: 8,
    position: "relative",
    backgroundColor: "#000",
  },
  videoStream: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
});

export default UserCard;
