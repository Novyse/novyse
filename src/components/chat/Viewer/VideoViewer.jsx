import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import Icon from "@/src/components/Icon";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const speeds = [0.25, 0.5, 0.75, 1, 1.5, 2];

const VideoViewer = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;

  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  const lastVolumeRef = useRef(1);
  const wasPlayingBeforeSeek = useRef(false);
  const controlsTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // --- ZOOM LOGIC ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) scale.value = withSpring(1);
      savedScale.value = scale.value;
    });
  const animatedVideoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
    p.play();
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
  });
  const { volume } = useEvent(player, "volumeChange", {
    volume: player.volume,
  });
  const duration = player.duration || 0;

  useEffect(() => {
    if (!isSeeking) setSeekTime(currentTime);
  }, [currentTime, isSeeking]);

  // Gestione Fullscreen e Orientamento
  useEffect(() => {
    if (Platform.OS === "web") {
      const handler = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", handler);
      return () => document.removeEventListener("fullscreenchange", handler);
    } else {
      const sub = ScreenOrientation.addOrientationChangeListener((e) => {
        const isL = e.orientationInfo.orientation > 2;
        setIsFullscreen(isL);
        StatusBar.setHidden(isL, "fade");
      });
      return () => ScreenOrientation.removeOrientationChangeListener(sub);
    }
  }, []);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPlaying || isSeeking) return;
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleUserActivity = () => {
    setShowControls(true);
    resetControlsTimeout();
  };

  const toggleFullscreen = async () => {
    if (Platform.OS === "web") {
      if (!document.fullscreenElement)
        containerRef.current?.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else {
      if (!isFullscreen) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      }
    }
  };

  const cycleSpeed = () => {
    const nextIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(nextIndex);
    player.playbackRate = speeds[nextIndex];
    handleUserActivity();
  };

  if (!uri) return <View style={styles.container} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        ref={containerRef}
        style={styles.container}
        onMouseMove={Platform.OS === "web" ? handleUserActivity : undefined}
      >
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={[styles.videoContainer, animatedVideoStyle]}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
            />
          </Animated.View>
        </GestureDetector>

        <Pressable onPress={handleUserActivity} style={StyleSheet.absoluteFill}>
          {showControls && (
            <SafeAreaView
              style={[styles.overlay, isFullscreen && styles.overlayLandscape]}
            >
              <View style={styles.header}>
                <Icon
                  name="Cancel01Icon"
                  onPress={() => router.back()}
                  color="white"
                />
              </View>

              <View style={styles.centerContainer}>
                <Icon
                  name="GoBackward10SecIcon"
                  size={32}
                  color="white"
                  onPress={() => (player.currentTime -= 10)}
                />
                <Pressable
                  style={styles.playButtonMain}
                  onPress={() => (isPlaying ? player.pause() : player.play())}
                >
                  <Icon
                    name={isPlaying ? "PauseIcon" : "PlayIcon"}
                    size={40}
                    color="white"
                  />
                </Pressable>
                <Icon
                  name="GoForward10SecIcon"
                  size={32}
                  color="white"
                  onPress={() => (player.currentTime += 10)}
                />
              </View>

              <View style={styles.footerContainer}>
                <View style={styles.sliderRow}>
                  <Text style={styles.timeText}>
                    {formatTime(isSeeking ? seekTime : currentTime)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={isSeeking ? seekTime : currentTime}
                    onSlidingStart={() => {
                      setIsSeeking(true);
                      player.pause();
                    }}
                    onValueChange={(v) => {
                      setSeekTime(v);
                      player.currentTime = v;
                    }}
                    onSlidingComplete={(v) => {
                      setIsSeeking(false);
                      player.play();
                    }}
                    minimumTrackTintColor="#3b82f6"
                    thumbTintColor="#ffffff"
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                <View style={styles.bottomActionsRow}>
                  <View style={styles.volumeContainer}>
                    <Icon
                      name={
                        volume === 0 ? "VolumeMute02Icon" : "VolumeHighIcon"
                      }
                      size={22}
                      color="white"
                      onPress={() => (player.volume = volume > 0 ? 0 : 1)}
                    />
                    <Slider
                      style={styles.volumeSlider}
                      minimumValue={0}
                      maximumValue={1}
                      value={volume}
                      onValueChange={(v) => (player.volume = v)}
                      minimumTrackTintColor="#3b82f6"
                      thumbTintColor="#ffffff"
                    />
                  </View>
                  <View style={styles.rightActions}>
                    <Pressable style={styles.speedButton} onPress={cycleSpeed}>
                      <Text style={styles.speedText}>
                        {speeds[currentSpeedIndex]}x
                      </Text>
                    </Pressable>
                    <Icon
                      name={
                        isFullscreen ? "ArrowShrink02Icon" : "ArrowExpand01Icon"
                      }
                      color="white"
                      onPress={toggleFullscreen}
                    />
                  </View>
                </View>
              </View>
            </SafeAreaView>
          )}
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", overflow: "hidden" },
  videoContainer: { flex: 1 },
  video: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
  overlayLandscape: { paddingHorizontal: 40 },
  header: { padding: 16 },
  centerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 50,
  },
  playButtonMain: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  footerContainer: { paddingBottom: 20, paddingHorizontal: 20 },
  sliderRow: { flexDirection: "row", alignItems: "center" },
  slider: { flex: 1, marginHorizontal: 10, height: 40 },
  timeText: { color: "#fff", fontSize: 12, fontWeight: "600", minWidth: 40 },
  bottomActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  volumeContainer: { flexDirection: "row", alignItems: "center", width: 160 },
  volumeSlider: { flex: 1, marginLeft: 10, height: 30 },
  rightActions: { flexDirection: "row", alignItems: "center", gap: 20 },
  speedButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  speedText: { color: "white", fontSize: 12, fontWeight: "bold" },
});

export default VideoViewer;
