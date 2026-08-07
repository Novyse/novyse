import React, { useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

import { AudioPlayerContext } from "@/src/context/AudioPlayerContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";
import FileSizeProgress from "./FileSizeProgress";

import { formatTime, formatDuration } from "@/src/utils/storage/file/utils";
import SmoothWaveform from "./MessageVoiceWaveform";
import PlayButton from "./Button";

const MessageVoice = ({
  audioRef,
  uuid,
  size,
  message,
  duration,
  isPending,
  waveform = undefined,
}) => {
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
  const { uri: profilePictureUri } = useProfilePicture(
    message.profile_picture_uuid,
  );

  const handlePlayPress = () => {
    addInfo(
      message.chatUUID,
      message.id,
      message.senderUUID,
      profilePictureUri,
      message.created_at,
    );
    handlePlayPause(playableUri);
  };

  return (
    <View style={styles.container}>
      <PlayButton
        uuid={uuid}
        isPending={isPending}
        isAvailable={!!audioRef}
        isReady={isReady}
        isPlaying={isThisPlaying}
        type={"VOICE"}
        handleDefaultPress={handlePlayPress}
      />

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
          <AppText
            style={styles.durationText}
            text={`${formatTime(thisCurrentTime)} / ${formatDuration(duration)}`}
          />
          <FileSizeProgress uuid={uuid} size={size} style={styles.sizeText} />
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
      paddingHorizontal: 10,
      paddingTop: 5,
      minWidth: 180,
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
    },
    durationText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "left",
      fontVariant: ["tabular-nums"],
      opacity: 0.8,
    },
    sizeText: {
      fontSize: 12,
      color: theme.text,
      textAlign: "right",
      opacity: 0.8,
    },
  });
}

export default React.memo(MessageVoice);
