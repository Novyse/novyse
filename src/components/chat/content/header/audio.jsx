import React, { useContext } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import { DateTime } from "luxon";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

import { formatTime } from "@/src/utils/storage/file/utils";
import SmoothSlider from "@/src/components/SmoothSlider";

import { ThemeContext } from "@/context/ThemeContext";
import { AudioPlayerContext } from "@/context/AudioPlayerContext";

const AudioHeader = ({}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    isPlaying,
    playbackRate,
    currentTime,
    duration,
    didJustFinish,
    currentUri,
    audioInfo,
    handlePlayPause,
    handleSeek,
    handleChangePlaybackRate,
    removeAudio,
  } = useContext(AudioPlayerContext);

  const isValidDuration = duration && Number.isFinite(duration) && duration > 0;
  const safeDuration = isValidDuration ? duration : 0;

  return (
    // da gestire un eventuale evento per navigare allo specifico messaggio @SamueleOrazioDurante
    <Pressable
      onPress={() => {}}
      style={styles.container}
    >
      <View style={{ flexDirection: "row" }}>
        <HoverAndPressedButton
          style={styles.iconButton}
          activeOpacity={0.8}
          onPress={() => handlePlayPause(currentUri)}
        >
          <Icon name={isPlaying ? "PauseIcon" : "PlayIcon"} />
        </HoverAndPressedButton>
        <View style={styles.contentContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.titleText}>
              <Text
                style={styles.subtitleText}
                selectable={false}
                // numberOfLines={1}
              >
                {audioInfo.senderName} |{" "}
                {DateTime.fromJSDate(new Date(audioInfo.timestamp)).isValid
                  ? DateTime.fromJSDate(new Date(audioInfo.timestamp)).toFormat(
                      "yyyy-MM-dd HH:mm",
                    )
                  : audioInfo.timestamp}
              </Text>
            </Text>
            <Text style={styles.timeText} selectable={false} numberOfLines={1}>
              {formatTime(currentTime)} / {formatTime(safeDuration)}
            </Text>
          </View>
        </View>
        <View style={styles.rightControls}>
          <HoverAndPressedButton
            style={styles.iconButton}
            onPress={() => {
              handleChangePlaybackRate();
            }}
          >
            <Text style={styles.speedText} selectable={false}>
              {playbackRate}x
            </Text>
          </HoverAndPressedButton>
          <HoverAndPressedButton
            style={styles.iconButton}
            onPress={removeAudio}
          >
            <Icon name={"Cancel01Icon"} />
          </HoverAndPressedButton>
        </View>
      </View>
      <SmoothSlider
        currentValue={currentTime}
        maxValue={safeDuration}
        playbackRate={playbackRate}
        onSeek={handleSeek}
        reset={didJustFinish}
        isMoving={isPlaying}
        showThumb={false}
      />
    </Pressable>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flexDirection: "column",
      // alignItems: "center",
      paddingVertical: 12,
      width: "100%",
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    contentContainer: {
      flex: 1,
      justifyContent: "center",
      marginRight: 12,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    titleText: {
      color: theme.text,
      fontSize: 14,
      marginRight: 10,
    },
    subtitleText: {
      fontWeight: "400",
      color: theme.text,
    },
    timeText: {
      color: theme.text,
      fontSize: 12,
      fontVariant: ["tabular-nums"],
    },
    rightControls: {
      flexDirection: "row",
      alignItems: "center",
    },
    speedText: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 14,
    },
  });
}

export default AudioHeader;
