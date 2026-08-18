import React, { useContext, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";

import { AudioPlayerContext } from "@/src/context/AudioPlayerContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import useProfilePicture from "@/src/hooks/avatar/useProfilePicture";
import FileSizeProgress from "./FileSizeProgress";

import { formatTime, formatDuration } from "@/src/utils/storage/file/utils";

import Slider from "@/src/components/ui/slider/Slider";
import PlayButton from "./Button/MessageButton";

const MessageAudio = ({
  audioRef,
  uuid,
  size,
  name,
  message,
  duration,
  isPending,
}) => {
  const {
    isPlaying,
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
        type={"AUDIO"}
        handleDefaultPress={handlePlayPress}
      />

      <View style={{ flexDirection: "column" }}>
        <Typography text={name} />
        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            value={thisCurrentTime}
            maxValue={duration || 1}
            onSeekComplete={handleSeek}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.secondary}
            thumbTintColor={theme.primary}
          />
          <View>
            <Typography
              text={`${formatTime(thisCurrentTime)} / ${formatDuration(duration)}`}
            />
            <FileSizeProgress uuid={uuid} size={size} />
          </View>
        </View>
      </View>
    </View>
  );
};

function createStyle() {
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
      width: "100%",
    },
  });
}

export default React.memo(MessageAudio);
