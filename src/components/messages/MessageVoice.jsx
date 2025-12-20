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

import { formatTime, formatFileSize } from "@/src/utils/storage/file/utils";
import SmoothWaveform from "../SmoothWaveform";

const MessageAudio = ({ audioRef, uuid, mimeType, size }) => {
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

  // Valori statici per la waveform (50 barre, valori tra 0 e 1)
  const waveformData = [
    0.73716100166034, 0.8367726846214676, 0.9008939948296025,
    0.09882654568369253, 0.8690468149905026, 0.8674881230598692,
    0.9371662430963056, 0.3849818409465632, 0.19440798966290818,
    0.5605540357238272, 0.074936275289605, 0.3989874853202968,
    0.521771227000656, 0.5089968475655664, 0.704075080688916,
    0.28783149580929834, 0.21699942603387434, 0.5281898560411679,
    0.1831154253261683, 0.12716470396849888, 0.4122528861262833,
    0.1715969578855161, 0.6310459718695424, 0.09842093651014538,
    0.7479440213899051, 0.9932769939202695, 0.04382693945036775,
    0.6227014948471391, 0.5584989143680368, 0.19074663669159797,
    0.15791723104187105, 0.6440094874130156, 0.2315559454362116,
    0.47229984631969457, 0.17746743446091684, 0.9121261928608526,
    0.9871108570383447, 0.9557247176680778, 0.9982715796738065,
    0.03168442997752996, 0.9529861926800227, 0.66672964897243,
    0.7374558843917352, 0.8998779988031088, 0.9566768850889973,
    0.3242465157439205, 0.8782431721467635, 0.40371289180690795,
    0.9754664229096691, 0.3789821606239272,
  ]; //Array.from({ length: 50 }, () => Math.random());

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
        <SmoothWaveform
          waveformData={waveformData}
          currentValue={thisCurrentTime * 1000}
          maxValue={safeDuration * 1000}
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
      width: "100%",
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
