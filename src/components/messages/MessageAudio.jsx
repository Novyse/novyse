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

import {
  formatTime,
  formatDuration,
  formatFileSize,
} from "@/src/utils/storage/file/utils";

import SmoothSlider from "../SmoothSlider";
import PlayButton from "./Button";

const MessageAudio = ({ audioRef, uuid, size, name, message, duration }) => {
  const {
    isPlaying,
    playBackRate,
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

  const handlePlayPress = () => {
    addInfo(
      message.chatUUID,
      message.id,
      message.sender_name,
      message.created_at
    );
    handlePlayPause(playableUri);
  };

  return (
    <View style={styles.container}>
      <PlayButton
        uuid={uuid}
        isAvailable={!!audioRef}
        isReady={isReady}
        isPlaying={isThisPlaying}
        type={"AUDIO"}
        handleDefaultPress={handlePlayPress}
      />

      <View style={{ flexDirection: "column" }}>
        <Text style={styles.fileName} selectable={false}>
          {name}
        </Text>
        <View style={styles.progressContainer}>
          <SmoothSlider
            currentValue={thisCurrentTime}
            maxValue={duration}
            playbackRate={playBackRate}
            onSeek={handleSeek}
            reset={!isThisLoaded || didJustFinish}
            isMoving={isThisPlaying}
          />
          <View style={styles.textContainer}>
            <Text style={styles.durationText} selectable={false}>
              {formatTime(thisCurrentTime)} / {formatDuration(duration)}
            </Text>
            <Text style={styles.sizeText} selectable={false}>
              {formatFileSize(size)}
            </Text>
          </View>
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
      alignSelf: "stretch",
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
    fileName: {
      color: theme.text,
    },
  });
}

export default React.memo(MessageAudio);
