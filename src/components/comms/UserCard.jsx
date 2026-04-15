import React, { memo, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";

import { getPlatform } from "@/src/utils/device/type";

import UserProfileAvatar from "./UserProfileAvatar";
import BlurredView from "../BlurredView";
import Icon from "../Icon";

const platform = getPlatform();

let RTCView;

if (platform === "mobile") {
  RTCView = require("@livekit/react-native-webrtc").RTCView;
}

const UserCard = memo(
  ({
    streamUUID,
    deviceUUID,
    stream = null,
    displayName,
    metadata = {},
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
    facingMode,
  }) => {
    const videoRef = useRef(null);
    useEffect(() => {
      if (platform === "web" && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    const parsedMetadata = JSON.parse(metadata);
    const profilePictureUUID = parsedMetadata.profilePictureUUID || null;

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
            deviceUUID={deviceUUID}
            stream={stream}
            isLocal={isLocal}
            displayName={displayName}
            profilePictureUUID={profilePictureUUID}
            width={width}
            height={height}
            facingMode={facingMode}
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
    deviceUUID,
    stream,
    isLocal,
    displayName,
    profilePictureUUID,
    width,
    height,
    facingMode,
  }) => {
    const streamActive =
      stream && stream.getVideoTracks().some((track) => track.enabled);

    // ref used only on web for the <video> element
    const videoRef = useRef(null);

    useEffect(() => {
      if ((platform === "web" || platform === "desktop") && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <View style={styles.videoContainer}>
        {streamActive ? (
          platform === "mobile" ? (
            <RTCView
              key={`${streamUUID}_${isLocal ? facingMode : ""}`}
              streamURL={stream.toURL()}
              style={[styles.videoStream, { objectFit: "contain" }]}
              muted={isLocal}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted={isLocal}
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )
        ) : (
          <UserProfileAvatar
            userHandle={displayName}
            deviceUUID={deviceUUID}
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
