import { useContext, useState, useEffect, useCallback } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/features/messages/Button/MessageButton";
import FileSizeProgress from "@/src/components/features/messages/FileSizeProgress";

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

  const { chatUUIDorHandle, sub } = useLocalSearchParams();

  const openMedia = useCallback(() => {
    router.push({
      pathname: "/app/chat/[chatUUIDorHandle]/[sub]/media-modal",
      params: {
        chatUUIDorHandle: String(chatUUIDorHandle ?? ""),
        sub: String(sub ?? "0"),
        uri,
        uuid,
        type: "VIDEO",
      },
    });
  }, [chatUUIDorHandle, sub, uri, uuid]);

  useEffect(() => {
    const newRatio =
      propAspectRatio || (width && height ? width / height : null);
    if (newRatio) {
      setCurrentRatio(newRatio);
      ratioCache.set(uuid, newRatio);
    }
  }, [propAspectRatio, width, height, uuid]);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
  });

  useEffect(() => {
    if (!player) return;

    player.muted = true;
    player.volume = 0;
    player.pause();
    return () => {
      try {
        player.pause();
      } catch {
        // player already released
      }
    };
  }, [player]);

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
      <Pressable onPress={openMedia} style={styles.container}>
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
              handleDefaultPress={openMedia}
            />
          </View>
        </View>
        <View style={styles.videoSizeOverlay}>
          <FileSizeProgress uuid={uuid} size={size} />
        </View>
      </Pressable>
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
    videoSizeOverlay: {
      position: "absolute",
      top: 5,
      left: 5,
      borderRadius: 25,
      backgroundColor: theme.backgroundModalOverlay,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
  });

export default Video;
