import React, { useRef, useContext, useEffect } from "react";
import { View, StyleSheet, Pressable, Animated, Platform } from "react-native";
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

  const isPlaying = watchTogetherState?.status === "playing";

  // Refs to hold latest values for dependency-free keyboard handler
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const triggerPlayRef = useRef(triggerPlay);
  const triggerPauseRef = useRef(triggerPause);
  const triggerSeekRef = useRef(triggerSeek);
  const showControlsAndResetTimerRef = useRef<() => void>(() => {});

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    triggerPlayRef.current = triggerPlay;
  }, [triggerPlay]);

  useEffect(() => {
    triggerPauseRef.current = triggerPause;
  }, [triggerPause]);

  useEffect(() => {
    triggerSeekRef.current = triggerSeek;
  }, [triggerSeek]);

  const lastSeekBroadcastRef = useRef<number>(0);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const pendingSeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledSeek = (time: number) => {
    // Seek local player instantly
    playerRef.current?.seek(time);

    // Clear any pending debounced seek
    if (pendingSeekTimeoutRef.current) {
      clearTimeout(pendingSeekTimeoutRef.current);
      pendingSeekTimeoutRef.current = null;
    }

    const now = Date.now();
    const timeSinceLastBroadcast = now - lastSeekBroadcastRef.current;

    if (timeSinceLastBroadcast >= 300) {
      // It's been long enough, broadcast immediately
      triggerSeekRef.current(time);
      lastSeekBroadcastRef.current = now;
      pendingSeekTimeRef.current = null;
    } else {
      // Queue it up to broadcast at the end of the throttle period
      pendingSeekTimeRef.current = time;
      pendingSeekTimeoutRef.current = setTimeout(() => {
        if (pendingSeekTimeRef.current !== null) {
          triggerSeekRef.current(pendingSeekTimeRef.current);
          lastSeekBroadcastRef.current = Date.now();
          pendingSeekTimeRef.current = null;
        }
      }, 300 - timeSinceLastBroadcast);
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or editable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case " ": {
          e.preventDefault();
          if (isPlayingRef.current) {
            triggerPauseRef.current();
          } else {
            triggerPlayRef.current();
          }
          showControlsAndResetTimerRef.current();
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const targetTime = Math.max(0, currentTimeRef.current - 5);
          throttledSeek(targetTime);
          showControlsAndResetTimerRef.current();
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const targetTime = Math.min(
            durationRef.current || 100,
            currentTimeRef.current + 5,
          );
          throttledSeek(targetTime);
          showControlsAndResetTimerRef.current();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const targetTime = Math.min(
            durationRef.current || 100,
            currentTimeRef.current + 30,
          );
          throttledSeek(targetTime);
          showControlsAndResetTimerRef.current();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const targetTime = Math.max(0, currentTimeRef.current - 30);
          throttledSeek(targetTime);
          showControlsAndResetTimerRef.current();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingSeekTimeoutRef.current) {
        clearTimeout(pendingSeekTimeoutRef.current);
      }
    };
  }, []);

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

  const [controlsVisible, setControlsVisible] = React.useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const showControlsAndResetTimer = () => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  showControlsAndResetTimerRef.current = showControlsAndResetTimer;

  const handleMouseLeave = () => {
    if (isPlaying) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      showControlsAndResetTimer();
    } else {
      setControlsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: controlsVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible]);

  const styles = createStyles(theme);

  // If no session is active, return null immediately so it disappears completely
  if (!watchTogetherState || (!parsedVideo.videoId && !parsedVideo.videoUrl)) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { width: "100%", height: "100%" },
        isFullScreen && { borderRadius: 0 },
      ]}
      // @ts-ignore
      onMouseMove={showControlsAndResetTimer}
      // @ts-ignore
      onMouseEnter={showControlsAndResetTimer}
      // @ts-ignore
      onMouseLeave={handleMouseLeave}
    >
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
              if (!controlsVisible) {
                showControlsAndResetTimer();
              } else {
                if (isPlaying) {
                  triggerPause();
                } else {
                  triggerPlay();
                }
                showControlsAndResetTimer();
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
        <Animated.View
          style={[styles.controlsContainer, { opacity: opacityAnim }]}
          pointerEvents={controlsVisible ? "auto" : "none"}
          onTouchStart={showControlsAndResetTimer}
        >
          <Pressable
            style={styles.playPauseBtn}
            onPress={() => {
              if (isPlaying) {
                triggerPause();
              } else {
                triggerPlay();
              }
              showControlsAndResetTimer();
            }}
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
            onSlidingComplete={(value) => {
              triggerSeek(value);
              showControlsAndResetTimer();
            }}
          />

          <View style={styles.timeWrapper}>
            <AppText
              style={styles.timeText}
              text={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            />
          </View>
        </Animated.View>
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
