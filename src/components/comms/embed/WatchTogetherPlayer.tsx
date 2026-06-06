import React, { useRef, useContext, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import { ThemeContext } from "@/src/context/ThemeContext";
import { useWatchTogether } from "@/src/hooks/comms/useWatchTogether";
import { useCommsContext } from "@/src/context/CommsContext";
import { YouTubePlayer } from "./YouTubePlayer";
import { DirectVideoPlayer } from "./DirectVideoPlayer";

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds === null) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

interface WatchTogetherPlayerProps {
  width?: number;
  height?: number;
  margin?: number;
  isFullScreen?: boolean;
  onVideoPress?: (event: any) => void;
}

export const WatchTogetherPlayer: React.FC<WatchTogetherPlayerProps> = ({
  width,
  height,
  margin,
  isFullScreen = false,
  onVideoPress,
}) => {
  const { theme } = useContext(ThemeContext);
  const { localMuted, remoteVolumes } = useCommsContext();
  const playerRef = useRef<any>(null);

  const isMuted = localMuted["watch-together"] ?? false;
  const dbVolume = remoteVolumes["watch-together"] ?? 0;

  const {
    watchTogetherState,
    parsedVideo,
    currentTime,
    duration,
    stopSession,
    triggerPlay,
    triggerPause,
    triggerSeek,
    onPlayerReady,
    onPlayerStateChange,
    onPlayerTimeUpdate,
  } = useWatchTogether(playerRef);

  const dbToLinear = (db: number) => {
    if (db <= -30) return 0;
    const linear = Math.pow(10, db / 20);
    return Math.min(1.0, linear);
  };

  // Synchronize local volume and mute states to the embedded player
  useEffect(() => {
    if (!playerRef.current) return;

    if (isMuted) {
      playerRef.current.mute?.();
    } else {
      playerRef.current.unmute?.();
    }

    const linearVol = dbToLinear(dbVolume);
    const volumePercent = Math.round(linearVol * 100);
    playerRef.current.setVolume?.(volumePercent);
  }, [isMuted, dbVolume, watchTogetherState]);

  const handleReady = () => {
    onPlayerReady();
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unmute?.();
      }
      const linearVol = dbToLinear(dbVolume);
      playerRef.current.setVolume?.(Math.round(linearVol * 100));
    }
  };

  const styles = createStyles(theme);

  // If no session is active, return null immediately so it disappears completely
  if (!watchTogetherState || (!parsedVideo.videoId && !parsedVideo.videoUrl)) {
    return null;
  }

  const isPlaying = watchTogetherState.status === "playing";

  return (
    <View style={[styles.container, { width: "100%", height: "100%" }, isFullScreen && { borderRadius: 0 }]}>
      <View style={styles.playerContainer}>
        {parsedVideo.type === "youtube" && parsedVideo.videoId ? (
          <YouTubePlayer
            ref={playerRef}
            videoId={parsedVideo.videoId}
            onReady={handleReady}
            onStateChange={onPlayerStateChange}
            onTimeUpdate={onPlayerTimeUpdate}
          />
        ) : parsedVideo.type === "direct" && parsedVideo.videoUrl ? (
          <DirectVideoPlayer
            ref={playerRef}
            videoUrl={parsedVideo.videoUrl}
            onReady={handleReady}
            onStateChange={onPlayerStateChange}
            onTimeUpdate={onPlayerTimeUpdate}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="AlertCircleIcon" size={24} color={theme.iconDanger} />
            <AppText
              style={styles.errorText}
              text="Formato URL non supportato"
            />
          </View>
        )}

        {/* Absolute transparent overlay to capture video-area gestures and prevent browser context menu */}
        {onVideoPress && (
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { outline: "none", cursor: "pointer" },
            ]}
            onPress={() => {
              if (isPlaying) {
                triggerPause();
              } else {
                triggerPlay();
              }
            }}
            onLongPress={onVideoPress}
            delayLongPress={500}
            // @ts-ignore
            onContextMenu={(e) => {
              e.preventDefault();
              onVideoPress(e);
            }}
          />
        )}
      </View>

      {/* 2. Sleek Custom Synchronization Controls Overlay */}
      {(parsedVideo.type === "youtube" || parsedVideo.type === "direct") && (
        <View style={styles.controlsContainer}>
          <Pressable
            style={styles.playPauseBtn}
            onPress={isPlaying ? triggerPause : triggerPlay}
          >
            <Icon
              name={isPlaying ? "PauseIcon" : "PlayIcon"}
              size={16}
              color={theme.text}
            />
          </Pressable>

          <Slider
            style={styles.timelineSlider}
            minimumValue={0}
            maximumValue={duration || 100}
            value={currentTime}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.borderColor}
            thumbTintColor={theme.primary}
            onSlidingComplete={triggerSeek}
          />

          <View style={styles.timeWrapper}>
            <AppText
              style={styles.timeText}
              text={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 8,
      backgroundColor: theme.shadowColor,
      overflow: "hidden",
      position: "relative",
    },
    playerContainer: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor: theme.shadowColor,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      gap: 10,
    },
    errorText: {
      fontSize: 13,
      color: theme.text,
      opacity: 0.8,
      textAlign: "center",
    },
    controlsContainer: {
      position: "absolute",
      bottom: 8,
      left: 8,
      right: 8,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.backgroundModalOverlay,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    playPauseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.borderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    timelineSlider: {
      flex: 1,
      height: 30,
    },
    timeWrapper: {
      justifyContent: "center",
      alignItems: "flex-end",
    },
    timeText: {
      fontSize: 11,
      color: theme.text,
      fontWeight: "500",
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    glassBadge: {
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
      paddingVertical: 20,
      borderRadius: 24,
      backgroundColor: theme.borderColor,
      // @ts-ignore
      backdropFilter: "blur(16px)",
      gap: 6,
    },
    placeholderIcon: {
      marginBottom: 4,
    },
    placeholderTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: 0.5,
    },
    placeholderSubtitle: {
      fontSize: 11,
      color: theme.subtitle,
      fontWeight: "500",
      letterSpacing: 0.2,
    },
  });
