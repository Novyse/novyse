import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import Icon from "@/src/components/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const VideoViewer = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;

  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.1;
    player.play();
  });

  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { currentTime } = useEvent(player, "timeUpdate", { currentTime: player.currentTime });
  const duration = player.duration || 0;

  // Gestione auto-hide controlli
  useEffect(() => {
    if (isPlaying && !isSeeking) resetControlsTimeout();
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, isSeeking]);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const toggleControls = () => {
    showControls ? setShowControls(false) : (setShowControls(true), resetControlsTimeout());
  };

  const handleSeek = (value) => {
    player.currentTime = value;
    setIsSeeking(false);
    if (isPlaying) resetControlsTimeout();
  };

  if (!uri) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false} 
        allowsFullscreen
        allowsPictureInPicture
      />

      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls}>
        {showControls && (
          <SafeAreaView style={styles.overlay}>
            
            <View style={styles.header}>
              <Icon name={"Cancel01Icon"} onPress={() => router.back()}/>
            </View>

            <View style={styles.centerContainer}>
              <Pressable 
                style={styles.playButtonMain}
                onPress={() => (isPlaying ? player.pause() : player.play())}
              >
                <Icon
                  name={isPlaying ? "PauseIcon" : "PlayIcon"} 
                  size={40} 
                  color="white" 
                  style={isPlaying ? {} : { marginLeft: 4 }}
                />
              </Pressable>
            </View>

            <View style={styles.footer}>
              <Text style={styles.timeText}>{formatTime(isSeeking ? currentTime : player.currentTime)}</Text>
              
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration > 0.1 ? duration : 1}
                value={isSeeking ? undefined : currentTime}
                onSlidingStart={() => { setIsSeeking(true); clearTimeout(controlsTimeoutRef.current); }}
                onSlidingComplete={handleSeek}
                minimumTrackTintColor="#3b82f6"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#ffffff"
              />

              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

          </SafeAreaView>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonMain: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  timeText: {
    color: "#fff",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
});

export default VideoViewer;