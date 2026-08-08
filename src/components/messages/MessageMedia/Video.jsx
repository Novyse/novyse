import React, { useContext, useState, useEffect, useCallback } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/messages/Button";
import VideoViewer from "@/src/components/features/modalSheets/viewer/VideoViewer";
import FileSizeProgress from "@/src/components/messages/FileSizeProgress";

// Simple session cache to remember ratios without DB persistence
const ratioCache = new Map();

const Video = ({
  fileRef,
  uuid,
  size,
  duration,
  isPending,
  isSingle,
  width,
  height,
  aspectRatio: propAspectRatio,
}) => {
  const { uri } = useUriResolver(fileRef);
  const { theme } = useContext(ThemeContext);

  // Initialize from cache or props
  const [currentRatio, setCurrentRatio] = useState(() => {
    if (propAspectRatio) return propAspectRatio;
    if (width && height) return width / height;
    return ratioCache.get(uuid) || 1.5;
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const newRatio = propAspectRatio || (width && height ? width / height : null);
    if (newRatio) {
      setCurrentRatio(newRatio);
      ratioCache.set(uuid, newRatio);
    }
  }, [propAspectRatio, width, height, uuid]);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  const updateRatio = useCallback(
    (newRatio) => {
      if (newRatio && newRatio !== currentRatio) {
        setCurrentRatio(newRatio);
        ratioCache.set(uuid, newRatio);
      }
    },
    [currentRatio, uuid],
  );

  // Monitor video size updates
  const handleVideoSizeChange = useCallback(
    (event) => {
      if (event.videoSize && event.videoSize.width > 0) {
        updateRatio(event.videoSize.width / event.videoSize.height);
      }
    },
    [updateRatio],
  );

  useEffect(() => {
    if (!player || currentRatio) return;
    const interval = setInterval(() => {
      if (player.videoSize?.width > 0) {
        updateRatio(player.videoSize.width / player.videoSize.height);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [player, currentRatio, updateRatio]);

  const styles = createStyle(theme, isSingle, currentRatio);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={styles.container}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          onVideoSizeChange={handleVideoSizeChange}
        />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.overlay}>
            <FileButton
              uuid={uuid}
              isPending={isPending}
              isAvailable={!!fileRef}
              isReady={!!uri}
              type={"VIDEO"}
              handleDefaultPress={() => setVisible(true)}
            />
          </View>
        </View>
        <FileSizeProgress uuid={uuid} size={size} style={styles.fileSize} />
      </Pressable>
      <VideoViewer
        visible={visible}
        onClose={() => setVisible(false)}
        uri={uri}
        theme={theme}
        uuid={uuid}
      />
    </>
  );
};

const createStyle = (theme, isSingle, aspectRatio) =>
  StyleSheet.create({
    container: {
      width: "100%",
      minHeight: 75,
      aspectRatio: isSingle ? aspectRatio || undefined : undefined,
      height: isSingle ? undefined : "100%",
      overflow: "hidden",
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
    fileSize: {
      position: "absolute",
      bottom: 6,
      left: 6,
      color: theme.text,
      paddingHorizontal: 4,
      borderRadius: 5,
      fontSize: 11,
    },
  });

export default Video;
