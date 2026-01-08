import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  SafeAreaView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import Icon from "@/src/components/Icon";

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

  // Stato locale per il tempo durante lo scrubbing per non dipendere solo dal player
  const [seekTime, setSeekTime] = useState(0);

  const lastVolumeRef = useRef(1);
  const wasPlayingBeforeSeek = useRef(false);
  const controlsTimeoutRef = useRef(null);
  const containerRef = useRef(null);

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

  // Sincronizza lo stato di seek locale quando non stiamo trascinando
  useEffect(() => {
    if (!isSeeking) {
      setSeekTime(currentTime);
    }
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const style = document.createElement("style");
      style.id = "hide-cursor-style";
      style.innerHTML = `* { cursor: none !important; }`;
      if (!showControls) document.head.appendChild(style);
      else {
        const existingStyle = document.getElementById("hide-cursor-style");
        if (existingStyle) existingStyle.remove();
      }
      return () => {
        const existingStyle = document.getElementById("hide-cursor-style");
        if (existingStyle) existingStyle.remove();
      };
    }
  }, [showControls]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const handler = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", handler);
      return () => document.removeEventListener("fullscreenchange", handler);
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

  useEffect(() => {
    resetControlsTimeout();
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, isSeeking]);

  const toggleMute = () => {
    if (player.volume > 0) {
      lastVolumeRef.current = player.volume;
      player.volume = 0;
    } else {
      player.volume = lastVolumeRef.current || 1;
    }
    handleUserActivity();
  };

  const getVolumeIcon = () => {
    if (volume === 0) return "VolumeMute02Icon";
    if (volume < 0.5) return "VolumeLowIcon";
    return "VolumeHighIcon";
  };

  const toggleFullscreen = () => {
    if (Platform.OS === "web") {
      if (!document.fullscreenElement)
        containerRef.current?.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  };

  const cycleSpeed = () => {
    const nextIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(nextIndex);
    player.playbackRate = speeds[nextIndex];
    resetControlsTimeout();
  };

  // --- FIX SEEK IN TEMPO REALE ---
  const handleSlidingStart = () => {
    setIsSeeking(true);
    wasPlayingBeforeSeek.current = player.playing;
    player.pause(); // Pausa necessaria per liberare risorse di decodifica durante lo scrub
  };

  const handleOnValueChange = (value) => {
    setSeekTime(value);
    // Forza il player a saltare al tempo indicato immediatamente
    player.currentTime = value;
    handleUserActivity();
  };

  const handleSlidingComplete = (value) => {
    player.currentTime = value;
    setIsSeeking(false);
    if (wasPlayingBeforeSeek.current) player.play();
    resetControlsTimeout();
  };

  if (!uri) return <View style={styles.container} />;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      // @ts-ignore
      onMouseMove={Platform.OS === "web" ? handleUserActivity : undefined}
    >
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={false}
      />

      <Pressable
        onPress={handleUserActivity}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === "web" && {
            cursor: showControls ? "default" : "none",
          },
        ]}
      >
        {showControls && (
          <SafeAreaView style={styles.overlay}>
            <View style={styles.header}>
              <Icon
                name="Cancel01Icon"
                onPress={() => router.back()}
                color="white"
              />
            </View>

            <View style={styles.centerContainer}>
              <Pressable
                style={styles.skipButton}
                onPress={() => (player.currentTime -= 10)}
              >
                <Icon name="GoBackward10SecIcon" size={32} color="white" />
              </Pressable>

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

              <Pressable
                style={styles.skipButton}
                onPress={() => (player.currentTime += 10)}
              >
                <Icon name="GoForward10SecIcon" size={32} color="white" />
              </Pressable>
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
                  onSlidingStart={handleSlidingStart}
                  onValueChange={handleOnValueChange}
                  onSlidingComplete={handleSlidingComplete}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#ffffff"
                />
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              <View style={styles.bottomActionsRow}>
                <View style={styles.volumeContainer}>
                  <Pressable onPress={toggleMute} style={{ padding: 5 }}>
                    <Icon name={getVolumeIcon()} size={22} color="white" />
                  </Pressable>
                  <Slider
                    style={styles.volumeSlider}
                    minimumValue={0}
                    maximumValue={1}
                    value={volume}
                    onValueChange={(val) => {
                      player.volume = val;
                      handleUserActivity();
                    }}
                    minimumTrackTintColor="#3b82f6"
                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                    thumbTintColor="#ffffff"
                  />
                </View>

                <View style={styles.rightActions}>
                  <Pressable style={styles.speedButton} onPress={cycleSpeed}>
                    <Text style={styles.speedText} selectable={false}>
                      {speeds[currentSpeedIndex]}x
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={toggleFullscreen}
                    style={styles.actionIcon}
                  >
                    <Icon
                      name={
                        isFullscreen ? "ArrowShrink02Icon" : "ArrowExpand01Icon"
                      }
                      color="white"
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </SafeAreaView>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  video: { width: "100%", height: "100%" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
  },
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
  skipButton: { padding: 10 },
  footerContainer: { paddingBottom: 20, paddingHorizontal: 20 },
  sliderRow: { flexDirection: "row", alignItems: "center" },
  slider: { flex: 1, marginHorizontal: 10, height: 40 },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  bottomActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -5,
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
  actionIcon: { padding: 5 },
});

export default VideoViewer;
