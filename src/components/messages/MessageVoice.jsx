import React, { useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "../Icon";

import { AudioPlayerContext } from "@/context/AudioPlayerContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";

import { formatTime, formatDuration } from "@/src/utils/storage/file/utils";
import SmoothWaveform from "../SmoothWaveform";

const MessageVoice = ({ audioRef, message, duration, waveform = undefined }) => {
  const {
    isPlaying,
    playbackRate,
    currentTime,
    didJustFinish,
    currentUri,
    addInfo,
    handlePlayPause,
    handleSeek,
  } = useContext(AudioPlayerContext);

  const { uri: playableUri } = useUriResolver(audioRef);

  const isThisLoaded = playableUri === currentUri;
  const thisCurrentTime = currentUri && isThisLoaded ? currentTime : 0;
  const isThisPlaying = isPlaying && isThisLoaded;

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  const isReady = !!playableUri;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          addInfo(
            message.chatUUID,
            message.id,
            message.sender_name,
            message.created_at
          );
          handlePlayPause(playableUri);
        }}
        disabled={!isReady}
        style={styles.playPauseButton}
      >
        {!isReady ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon
            name={isThisPlaying ? "PauseIcon" : "PlayIcon"}
            style={{ width: 18, height: 18, tintColor: "#fff" }}
          />
        )}
      </Pressable>

      <View style={styles.progressContainer}>
        <View style={styles.waveformWrapper}>
          <SmoothWaveform
            waveformData={waveform}
            currentValue={thisCurrentTime}
            maxValue={duration}
            playbackRate={playbackRate}
            onSeek={handleSeek}
            reset={!isThisLoaded || didJustFinish}
            isMoving={isThisPlaying}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.durationText} selectable={false}>
            {formatTime(thisCurrentTime)} / {formatDuration(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      minWidth: 180,
    },
    playPauseButton: {
      width: 45,
      height: 45,
      borderRadius: 100,
      backgroundColor: "#0088cc",
      marginRight: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    progressContainer: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
    },
    waveformWrapper: {
      height: 35,
      width: "100%",
      justifyContent: "center",
    },
    textContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 6,
    },
    durationText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
      fontVariant: ["tabular-nums"],
      opacity: 0.8,
    },
    sizeText: {
      fontSize: 11,
      color: theme.text,
      opacity: 0.6,
      textAlign: "right",
    },
  });
}

export default React.memo(MessageVoice);
