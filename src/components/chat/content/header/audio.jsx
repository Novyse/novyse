import React, { useContext, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { formatTime } from "@/src/utils/storage/file/utils";
import { ThemeContext } from "@/context/ThemeContext";
import { AudioPlayerContext } from "@/context/AudioPlayerContext";
import useUserStore from "@/context/UserContext";

const AudioHeader = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const getUser = useUserStore((state) => state.getUser);

  const {
    isPlaying,
    playbackRate,
    currentTime,
    duration,
    currentUri,
    audioInfo,
    handlePlayPause,
    handleChangePlaybackRate,
    removeAudio,
  } = useContext(AudioPlayerContext);

  const user = getUser(audioInfo.senderUUID);
  const senderName = user ? user.name : "Unknown User";

  const isValidDuration = duration && Number.isFinite(duration) && duration > 0;
  const safeDuration = isValidDuration ? duration : 0;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (isPlaying && safeDuration > 0) {
      const currentPercentage = (currentTime / safeDuration) * 100;
      progress.value = currentPercentage;

      const remainingTime =
        ((safeDuration - currentTime) * 1000) / (playbackRate || 1);

      progress.value = withTiming(100, {
        duration: Math.max(remainingTime, 0),
        easing: Easing.linear,
      });
    } else {
      cancelAnimation(progress);
      if (safeDuration > 0) {
        progress.value = (currentTime / safeDuration) * 100;
      } else {
        progress.value = 0;
      }
    }
  }, [isPlaying, currentTime, safeDuration, playbackRate]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Play/Pause Button */}
        <HoverAndPressedButton
          style={styles.playButton}
          activeOpacity={0.8}
          onPress={() => handlePlayPause(currentUri)}
        >
          <Icon
            name={isPlaying ? "PauseIcon" : "PlayIcon"}
            size={20}
            color={theme.text}
          />
        </HoverAndPressedButton>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <AppText
            style={styles.senderName}
            numberOfLines={1}
            text={senderName}
          />
          <View style={styles.statusRow}>
            <AppText style={styles.timeText} selectable={false}>
              {`${formatTime(currentTime)} / ${formatTime(safeDuration)}`}
            </AppText>
          </View>
        </View>

        {/* Right Controls */}
        <View style={styles.rightControls}>
          <HoverAndPressedButton
            style={styles.controlButton}
            onPress={() => handleChangePlaybackRate()}
          >
            <AppText text={`${playbackRate}x`} style={styles.rateText} />
          </HoverAndPressedButton>

          <HoverAndPressedButton
            style={styles.controlButton}
            onPress={removeAudio}
          >
            <Icon name="Cancel01Icon" size={20} color={theme.text} />
          </HoverAndPressedButton>
        </View>
      </View>

      {/* Modern Visual Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
      </View>
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: "transparent",
      paddingTop: 8,
      paddingBottom: 2,
      position: "relative",
    },
    mainContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    infoContainer: {
      flex: 1,
      justifyContent: "center",
    },
    senderName: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 2,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    timeText: {
      fontSize: 12,
      color: theme.placeholderText || "#888",
      fontVariant: ["tabular-nums"],
    },
    rateText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: "600",
    },
    rightControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    controlButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    progressTrack: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.border || "rgba(255,255,255,0.1)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.primary || "#007AFF",
      borderRadius: 2,
    },
  });
}

export default AudioHeader;
