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

const MessageVoice = ({ audioRef, uuid, mimeType, size }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    didJustFinish,
    currentUri,
    handlePlayPause,
    handleSeek,
  } = useContext(AudioPlayerContext);

  const { uri: playableUri } = useUriResolver(audioRef);

  const isThisLoaded = playableUri === currentUri;
  const thisCurrentTime = isThisLoaded ? currentTime : 0;
  const isThisPlaying = isPlaying && isThisLoaded;

  const { theme } = useContext(ThemeContext);
  const styles = useMemo(() => createStyle(theme), [theme]);

  const isReady = !!playableUri;

  const isValidDuration =
    duration && Number.isFinite(duration) && duration > 0;
  const safeDuration = isThisLoaded && isValidDuration ? duration : 0;

  // Valori statici (va bene così per ora)
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
  ];

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
            style={{ width: 18, height: 18, tintColor: "#fff" }} // Icona leggermente più grande per i vocali
          />
        )}
      </Pressable>

      <View style={styles.progressContainer}>
        {/* Wrapper View per dare una height esplicita alla waveform */}
        <View style={styles.waveformWrapper}> 
            <SmoothWaveform
            waveformData={waveformData}
            currentValue={thisCurrentTime}
            maxValue={safeDuration}
            onSeek={handleSeek}
            reset={!isThisLoaded || didJustFinish}
            isMoving={isThisPlaying}
            />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.durationText}>
            {formatTime(thisCurrentTime)} / {formatTime(safeDuration)}
          </Text>
          {/* Nei vocali a volte si preferisce non mostrare la size se è ridondante, ma lasciala se vuoi */}
          {/* <Text style={styles.sizeText}>{formatFileSize(size)}</Text> */}
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
      minWidth: 180
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
        width: '100%',
        justifyContent: 'center',
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