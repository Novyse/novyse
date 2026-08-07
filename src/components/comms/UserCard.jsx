import React, {
  memo,
  useMemo,
  useEffect,
  useRef,
  useContext,
  useState,
} from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";

import { getPlatform } from "@/src/utils/device/type";
import { useCommsContext } from "@/src/context/CommsContext";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";

import UserProfileAvatar from "./UserProfileAvatar";
import BlurredView from "../layout/BlurredView";
import Icon from "@/src/components/ui/icon/Icon";
import { WatchTogetherPlayer } from "./embed/WatchTogetherPlayer";

const platform = getPlatform();

let RTCView;

if (platform === "mobile") {
  RTCView = require("@livekit/react-native-webrtc").RTCView;
}

const UserCard = memo(
  ({
    streamUUID,
    deviceUUID,
    chatUUID,
    sub,
    stream = null,
    displayName,
    metadata = {},
    isLocal = false,
    isScreenShare = false,
    isWatchTogether = false,
    isPinned = false,
    isFullScreen = false,
    onPin,
    onFullScreen,
    onRemove,
    width,
    height,
    margin,
    isSpeaking,
    facingMode,
  }) => {
    const { t } = useTranslation();
    const {
      connected,
      checkRoomMatch,
      setTriggeredStream,
      setTriggeredPosition,
      localMuted,
    } = useCommsContext();

    const { theme } = useContext(ThemeContext);
    const styles = createStyles(theme);

    const volKey = isScreenShare ? streamUUID : deviceUUID;
    const isLocalMuted = localMuted[volKey] ?? false;

    const isHoverPlatform = Platform.OS === "web";
    const [hovered, setHovered] = useState(false);
    const controlsVisible = !isHoverPlatform || hovered;

    const parsedMetadata = useMemo(() => {
      if (!metadata) return {};
      if (typeof metadata === "string") {
        try {
          return JSON.parse(metadata);
        } catch (e) {
          return {};
        }
      }
      return metadata;
    }, [metadata]);
    const profilePictureUUID = parsedMetadata.profilePictureUUID || null;

    const finalDisplayName = isLocal
      ? `${displayName} (${t("chat.listItem.you")})`
      : displayName;

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
    }, [isScreenShare, isSpeaking, styles]);

    const hasControls =
      (stream && stream.active && !isLocal) ||
      (isScreenShare && isLocal) ||
      (connected && isWatchTogether);

    const handlePress = (event) => {
      if (!connected || !checkRoomMatch(chatUUID, sub)) {
        return;
      }

      if (event && event.preventDefault) {
        event.preventDefault();
      }

      const { pageX, pageY } = event?.nativeEvent || {};

      setTriggeredPosition({ x: pageX || 0, y: pageY || 0 });
      setTriggeredStream({
        streamUUID,
        deviceUUID,
        displayName: finalDisplayName,
        isScreenShare,
        isLocal,
      });
    };

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
          isFullScreen && { borderRadius: 0 },
        ]}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {isLocalMuted && (
          <View style={styles.muteIndicatorContainer}>
            <View style={styles.controlsRow}>
              <Icon name="MicOff01Icon" size={16} color={theme.iconDanger} />
            </View>
          </View>
        )}
        {hasControls && (
          <View
            style={[
              styles.controlsContainer,
              !controlsVisible && styles.controlsHidden,
            ]}
            pointerEvents={controlsVisible ? "auto" : "none"}
          >
            <BlurredView style={styles.controlsBlurred}>
              <View style={styles.controlsRow}>
                {(stream && stream.active && !isLocal && !isFullScreen) ||
                (isWatchTogether && !isFullScreen) ? (
                  <Icon
                    name={!isPinned ? "PinIcon" : "PinOffIcon"}
                    size={20}
                    onPress={() => onPin(streamUUID)}
                  />
                ) : null}
                {(stream && stream.active && !isLocal) || isWatchTogether ? (
                  <Icon
                    name={
                      !isFullScreen ? "ArrowExpand01Icon" : "ArrowShrink01Icon"
                    }
                    size={20}
                    onPress={() => onFullScreen(streamUUID)}
                  />
                ) : null}
                {isScreenShare && isLocal ? (
                  <Icon
                    name="ComputerRemoveIcon"
                    size={20}
                    onPress={() => onRemove(streamUUID)}
                  />
                ) : null}
              </View>
            </BlurredView>
          </View>
        )}

        {connected && isWatchTogether ? (
          <View
            style={[styles.videoContainer, isFullScreen && { borderRadius: 0 }]}
          >
            <WatchTogetherPlayer
              width={width}
              height={height}
              isFullScreen={isFullScreen}
              onVideoPress={handlePress}
            />
          </View>
        ) : isWatchTogether ? (
          <Pressable
            style={[
              styles.videoContainer,
              { outline: "none", cursor: "pointer" },
            ]}
            onPress={handlePress}
            onLongPress={handlePress}
            // @ts-ignore
            onContextMenu={handlePress}
            delayLongPress={500}
          >
            <UserProfileAvatar
              userHandle={displayName}
              deviceUUID={deviceUUID}
              profilePictureUUID={null}
              containerWidth={width}
              containerHeight={height}
            />
          </Pressable>
        ) : (
          <Pressable
            style={styles.videoContainer}
            onPress={handlePress}
            onLongPress={handlePress}
            // @ts-ignore
            onContextMenu={handlePress}
            delayLongPress={500}
          >
            <VideoContent
              streamUUID={streamUUID}
              deviceUUID={deviceUUID}
              stream={stream}
              isLocal={isLocal}
              displayName={finalDisplayName}
              profilePictureUUID={profilePictureUUID}
              width={width}
              height={height}
              facingMode={facingMode}
            />
            <View style={speakingOverlayStyle} />
          </Pressable>
        )}
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
    const { theme } = useContext(ThemeContext);
    const styles = createStyles(theme);

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

const createStyles = (theme) =>
  StyleSheet.create({
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
      opacity: 1,
    },
    controlsHidden: {
      opacity: 0,
    },
    muteIndicatorContainer: {
      position: "absolute",
      bottom: 0,
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
      backgroundColor: theme.backgroundModalOverlay,
    },
    fullscreenContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.shadowColor,
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
      borderColor: theme.successText,
      opacity: 1,
      ...(Platform.OS === "web" && {
        boxShadow: `inset 0 0 15px ${theme.successText}, 0 0 20px ${theme.successText}`,
      }),
      ...(Platform.OS === "ios" && {
        shadowColor: theme.successText,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      }),
    },
    videoContainer: {
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: 8,
      position: "relative",
      backgroundColor: theme.shadowColor,
    },
    videoStream: {
      width: "100%",
      height: "100%",
      borderRadius: 8,
    },
  });

export default UserCard;
