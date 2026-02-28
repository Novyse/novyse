import React, { useContext, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import { ThemeContext } from "@/context/ThemeContext";
import { formatDuration } from "@/src/utils/storage/file/utils";
import FileButton from "@/src/components/messages/Button";
import VideoViewer from "@/src/components/modalSheets/viewer/VideoViewer";

const Video = ({ fileRef, uuid, duration, isSingle }) => {
  const { uri } = useUriResolver(fileRef);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSingle);
  const [visible, setVisible] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  const handlePress = () => {
    if (!uri) return;
    setVisible(true);
  };

  return (
    <>
      <Pressable onPress={handlePress} style={styles.container}>
        <View pointerEvents="none" style={styles.videoWrapper}>
          {uri && (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
          )}
        </View>
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.overlay}>
            <FileButton
              uuid={uuid}
              isAvailable={!!fileRef}
              isReady={!!uri}
              type={"VIDEO"}
              handleDefaultPress={handlePress}
            />
          </View>
        </View>
        <Text style={styles.duration} selectable={false}>
          {formatDuration(duration)}
        </Text>
      </Pressable>
      <VideoViewer
        visible={visible}
        onClose={() => setVisible(false)}
        uri={uri}
        theme={theme}
      />
    </>
  );
};

const createStyle = (theme, isSingle) =>
  StyleSheet.create({
    container: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.backgroundColor,
      aspectRatio: isSingle ? 16 / 9 : undefined,
    },
    videoWrapper: {
      width: "100%",
      height: "100%",
    },
    video: {
      width: "100%",
      height: "100%",
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    duration: {
      position: "absolute",
      bottom: 6,
      right: 6,
      color: "white",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      paddingHorizontal: 4,
      borderRadius: 5,
      fontSize: 12,
    },
  });

export default Video;
