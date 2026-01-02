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

import SmoothSlider from "../SmoothSlider";
import { formatTime, formatFileSize } from "@/src/utils/storage/file/utils";

import MessageVoice from "./MessageVoice"; //TEMPORARY WRAPPER

const MessageAudio = ({ audioRef, uuid, mimeType, size }) => {
  //return <MessageVoice audioRef={audioRef} uuid={uuid} mimeType={mimeType} size={size} />; //TEMPORARY WRAPPER
  const {
    isPlaying,
    playBackRate,
    currentTime,
    duration,
    didJustFinish,
    currentUri,
    handlePlayPause,
    handleSeek,
  } = useContext(AudioPlayerContext);

  const { uri: playableUri } = useUriResolver(audioRef);

  const isThisLoaded = playableUri === currentUri;
  const thisDuration = isThisLoaded ? duration : 0;
  const thisCurrentTime = isThisLoaded ? currentTime : 0;
  const isThisPlaying = isPlaying && isThisLoaded;

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  const isReady = !!playableUri;

  // @SamueleOrazioDurante la duration si deve gestire da un altra parte, ma per ora chill
  const isValidDuration =
    thisDuration && Number.isFinite(thisDuration) && thisDuration > 0;
  const safeDuration = isValidDuration ? thisDuration : 0;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => handlePlayPause(playableUri)}
        disabled={!isReady}
        style={styles.playPauseButton}
      >
        {!isReady ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon
            name={isThisPlaying ? "PauseIcon" : "PlayIcon"}
            style={{ width: 15, height: 15, tintColor: "#fff" }}
          />
        )}
      </Pressable>

      <View style={styles.progressContainer}>
        <SmoothSlider
          currentValue={thisCurrentTime}
          maxValue={safeDuration}
          onSeek={handleSeek}
          reset={!isThisLoaded || didJustFinish}
          isMoving={isThisPlaying}
        />
        <View style={styles.textContainer}>
          <Text style={styles.durationText}>
            {formatTime(thisCurrentTime)} / {formatTime(safeDuration)}
          </Text>
          <Text style={styles.sizeText}>{formatFileSize(size)}</Text>
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
      paddingVertical: 5,
      alignSelf: "stretch"
    },
    playPauseButton: {
      padding: 8,
      borderRadius: 50,
      backgroundColor: "#0088cc",
      marginRight: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    progressContainer: {
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
    },
    slider: {
      flex: 1,
      height: 30,
    },
    textContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    durationText: {
      fontSize: 12,
      marginRight: 12,
      color: theme.text,
      textAlign: "left",
      fontVariant: ["tabular-nums"],
    },
    sizeText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
    },
    playbackRateButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: "#0088cc",
    },
    playbackRateText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: "bold",
    },
  });
}

export default React.memo(MessageAudio);
