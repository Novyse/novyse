import React from "react";
import {
  Dimensions,
  View,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Text,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useUriResolver from "@/src/hooks/file/useUriResolver";

import { formatDuration } from "@/src/utils/storage/file/utils";

const { width: screenWidth } = Dimensions.get("window");
const maxBubbleWidth = screenWidth * 0.6;

const Video = ({ fileRef, duration }) => {
  const router = useRouter();
  const { uri, isLoading } = useUriResolver(fileRef);

  // Serve solo per mostrare il primo frame come copertina
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.muted = true;
    player.pause();
  });

  const handlePress = () => {
    if (!uri) return;

    router.push({
      pathname: "/chat/VideoViewer",
      params: {
        uri: encodeURIComponent(uri),
      },
    });
  };

  if (!uri || isLoading) {
    return (
      <View style={[styles.videoContainer, styles.placeholder]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.videoContainer}>
      <View pointerEvents="none" style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      <View style={styles.overlay}>
        <View style={styles.playIconContainer}>
          <Ionicons
            name="play"
            size={32}
            color="white"
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>

      <Text style={styles.durationText}>{formatDuration(duration)}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    width: maxBubbleWidth,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  playIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  durationText: {
    position: "absolute",
    bottom: 8,
    right: 8,
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
  },
});

export default Video;
