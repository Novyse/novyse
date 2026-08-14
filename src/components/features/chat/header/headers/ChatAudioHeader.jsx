import { useContext, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";

import { formatTime } from "@/src/utils/storage/file/utils";
import { ThemeContext } from "@/src/context/ThemeContext";
import { AudioPlayerContext } from "@/src/context/AudioPlayerContext";
import useUserStore from "@/src/store/UserStore";

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
      <AppHeaderRow
        left={
          <View style={styles.headerLeft}>
            <Icon
              name={isPlaying ? "PauseIcon" : "PlayIcon"}
              onPress={() => handlePlayPause(currentUri)}
              style={headerIconButtonStyle.iconButton}
            />
            <View style={styles.headerLeftSender}>
              <Typography
                weight="semibold"
                numberOfLines={1}
                text={user?.name}
                translationKey="chat.unknownUser"
              />
              <Typography
                size="xs"
                variant="subtitle"
                numberOfLines={1}
                text={`${formatTime(currentTime)} / ${formatTime(safeDuration)}`}
              />
            </View>
          </View>
        }
        right={
          <>
            <HoverAndPressedButton
              style={headerIconButtonStyle.iconButton}
              onPress={() => handleChangePlaybackRate()}
            >
              <Typography
                size="xs"
                weight="semibold"
                text={`${playbackRate}x`}
              />
            </HoverAndPressedButton>
            <Icon
              name="Cancel01Icon"
              onPress={removeAudio}
              style={headerIconButtonStyle.iconButton}
            />
          </>
        }
      />
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
    },
    headerLeftSender: {
      flexDirection: "column",
      // justifyContent: "center",
      minWidth: 0,
    },
    headerLeft: {
      flexDirection: "row",
      gap: 5,
    },
    progressTrack: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      borderRadius: 10,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.primary,
    },
  });
}

export default AudioHeader;
