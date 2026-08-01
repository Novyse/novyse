import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "@/src/components/AppText";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Slider from "@react-native-community/slider";
import Icon from "@/src/components/Icon";
import * as ScreenOrientation from "expo-screen-orientation";
import { useWindowDimensions } from "react-native";
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
import { getPlatform } from "@/src/utils/device/type";
import { useScreen } from "@/src/context/ScreenContext";
import useDownload from "@/src/hooks/file/useDownload";
import useShare from "@/src/hooks/chat/useShare";

const formatTime = (seconds) => {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const speeds = [0.25, 0.5, 0.75, 1, 1.5, 2];

const VideoViewer = ({ visible, onClose, uri, theme, uuid }) => {
  const { downloadFile } = useDownload();
  const { shareFileOrText } = useShare();
  const isMobile = getPlatform() === "mobile";
  const { isSmallScreen } = useScreen();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);

  const styles = createStyle(
    theme,
    screenHeight,
    screenWidth,
    isSmallScreen,
    isFullscreen,
  );

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

  const setupPlayer = useCallback((p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.1;
  }, []);

  const player = useVideoPlayer(uri, setupPlayer);

  const playingChangeEvent = useEvent(player, "playingChange");
  const isPlaying = playingChangeEvent?.isPlaying ?? player.playing ?? false;

  const timeUpdateEvent = useEvent(player, "timeUpdate");
  const currentTime = timeUpdateEvent?.currentTime ?? player.currentTime ?? 0;

  const volumeChangeEvent = useEvent(player, "volumeChange");
  const volume = volumeChangeEvent?.volume ?? player.volume ?? 1;

  const statusChangeEvent = useEvent(player, "statusChange");
  const status = statusChangeEvent?.status ?? player.status;

  const duration = player.duration || 0;

  useEffect(() => {
    if (status === "readyToPlay" && player) {
      player.play();
    }
  }, [status, player]);

  // Gestione Fullscreen e Orientamento
  useEffect(() => {
    if (getPlatform() === "web") {
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
    if (getPlatform() === "web") {
      if (!document.fullscreenElement)
        containerRef.current?.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else {
      const nextState = !isFullscreen;
      setIsFullscreen(nextState);
      StatusBar.setHidden(nextState, "fade");
      if (nextState) {
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

  const togglePlayPause = () => {
    if (!player) return;
    handleUserActivity();

    if (duration > 0 && currentTime >= duration - 0.3) {
      player.currentTime = 0;
      player.play();
      return;
    }

    if (isPlaying || player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const skipBackward = () => {
    if (!player) return;
    player.currentTime = Math.max(0, (player.currentTime || 0) - 10);
    handleUserActivity();
  };

  const skipForward = () => {
    if (!player) return;
    player.currentTime = Math.min(duration, (player.currentTime || 0) + 10);
    handleUserActivity();
  };

  const cycleSpeed = () => {
    if (!player) return;
    const nextIndex = (currentSpeedIndex + 1) % speeds.length;
    setCurrentSpeedIndex(nextIndex);
    player.playbackRate = speeds[nextIndex];
    handleUserActivity();
  };

  const handleDownload = async () => {
    if (!uuid) return;
    await downloadFile({ uuid });
  };

  const handleShare = async () => {
    if (!uuid && !uri) return;
    await shareFileOrText({ uuid, uri });
  };

  if (!visible || !uri) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <View
          ref={containerRef}
          style={styles.container}
          onMouseMove={getPlatform() === "web" ? handleUserActivity : undefined}
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

          <Pressable
            onPress={handleUserActivity}
            style={StyleSheet.absoluteFill}
          >
            {showControls && (
              <SafeAreaView
                style={[
                  styles.overlay,
                  isFullscreen && styles.overlayLandscape,
                ]}
              >
                <View style={styles.header}>
                  <Icon
                    name="Cancel01Icon"
                    onPress={onClose}
                    color={theme.icon}
                    hoverColor={theme.iconHover}
                  />
                  <View style={styles.rightButtons}>
                    {uuid && (
                      <Icon
                        name="Download01Icon"
                        onPress={handleDownload}
                        color={theme.icon}
                        hoverColor={theme.iconHover}
                      />
                    )}
                    {isMobile && (
                      <Icon
                        name="Share01Icon"
                        onPress={handleShare}
                        color={theme.icon}
                        hoverColor={theme.iconHover}
                      />
                    )}
                  </View>
                </View>

                <View style={styles.centerContainer}>
                  <Icon
                    name="GoBackward10SecIcon"
                    size={32}
                    onPress={skipBackward}
                    color={theme.icon}
                    hoverColor={theme.iconHover}
                  />
                  <Pressable
                    style={styles.playButtonMain}
                    onPress={togglePlayPause}
                  >
                    <Icon
                      name={isPlaying ? "PauseIcon" : "PlayIcon"}
                      size={40}
                      color={theme.icon}
                      hoverColor={theme.iconHover}
                    />
                  </Pressable>
                  <Icon
                    name="GoForward10SecIcon"
                    size={32}
                    onPress={skipForward}
                    color={theme.icon}
                    hoverColor={theme.iconHover}
                  />
                </View>

                <View style={styles.footerContainer}>
                  <View style={styles.sliderRow}>
                    <AppText
                      style={styles.timeText}
                      text={formatTime(isSeeking ? seekTime : currentTime)}
                    />
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={duration}
                      value={isSeeking ? seekTime : currentTime}
                      onSlidingStart={() => {
                        setIsSeeking(true);
                        setSeekTime(currentTime);
                        player.pause();
                      }}
                      onValueChange={(v) => {
                        setSeekTime(v);
                      }}
                      onSlidingComplete={(v) => {
                        player.currentTime = v;
                        setIsSeeking(false);
                        player.play();
                      }}
                      minimumTrackTintColor={theme.primary}
                      thumbTintColor={theme.primary}
                    />
                    <AppText
                      style={styles.timeText}
                      text={formatTime(duration)}
                    />
                  </View>

                  <View style={styles.bottomActionsRow}>
                    <View style={styles.volumeContainer}>
                      <Icon
                        name={
                          (isAdjustingVolume ? localVolume : volume) === 0
                            ? "VolumeMute02Icon"
                            : "VolumeHighIcon"
                        }
                        size={22}
                        onPress={() => {
                          const newVol = (isAdjustingVolume ? localVolume : volume) > 0 ? 0 : 1;
                          player.volume = newVol;
                          setLocalVolume(newVol);
                        }}
                        color={theme.icon}
                        hoverColor={theme.iconHover}
                      />
                      <Slider
                        style={styles.volumeSlider}
                        minimumValue={0}
                        maximumValue={1}
                        value={isAdjustingVolume ? localVolume : volume}
                        onSlidingStart={() => {
                          setIsAdjustingVolume(true);
                          setLocalVolume(volume);
                        }}
                        onValueChange={(v) => {
                          setLocalVolume(v);
                        }}
                        onSlidingComplete={(v) => {
                          player.volume = v;
                          setIsAdjustingVolume(false);
                        }}
                        minimumTrackTintColor={theme.primary}
                        thumbTintColor={theme.primary}
                      />
                    </View>
                    <View style={styles.rightActions}>
                      <Pressable
                        style={styles.speedButton}
                        onPress={cycleSpeed}
                      >
                        <AppText
                          style={styles.speedText}
                          text={`${speeds[currentSpeedIndex]}x`}
                        />
                      </Pressable>
                      <Icon
                        name={
                          isFullscreen
                            ? "ArrowShrink02Icon"
                            : "ArrowExpand01Icon"
                        }
                        onPress={toggleFullscreen}
                        color={theme.icon}
                        hoverColor={theme.iconHover}
                      />
                    </View>
                  </View>
                </View>
              </SafeAreaView>
            )}
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const createStyle = (
  theme,
  screenHeight,
  screenWidth,
  isSmallScreen,
  isFullScreen,
) =>
  (() => {
    const isFull = isSmallScreen || isFullScreen;
    const baseWidth = isFull ? screenWidth : screenWidth * 0.9;
    const baseMaxHeight = isFull ? screenHeight : screenHeight * 0.9;

    const MAX_VERTICAL_AR = 16 / 9;
    const idealHeight = baseWidth * MAX_VERTICAL_AR;
    const constrainedHeight = Math.min(baseMaxHeight, idealHeight);

    return StyleSheet.create({
      modalRoot: {
        flex: 1,
        backgroundColor: theme.backgroundModalOverlay,
      },
      container: {
        flex: 1,
        backgroundColor: theme.backgroundModalOverlay,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      },
      videoContainer: {
        width: isFullScreen ? "100%" : baseWidth,
        height: isFullScreen ? "100%" : constrainedHeight,
        justifyContent: "center",
        alignItems: "center",
      },
      video: {
        width: "100%",
        height: "100%",
      },
      overlay: {
        flex: 1,
        backgroundColor: theme.backgroundModalOverlay,
        justifyContent: "space-between",
      },
      overlayLandscape: { paddingHorizontal: 40 },
      header: {
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      rightButtons: {
        flexDirection: "row",
        gap: 15,
      },
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
        backgroundColor: theme.backgroundModalOverlay,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.borderColor,
      },
      footerContainer: { paddingBottom: 20, paddingHorizontal: 20 },
      sliderRow: { flexDirection: "row", alignItems: "center" },
      slider: { flex: 1, marginHorizontal: 10, height: 40 },
      timeText: {
        color: theme.text,
        fontSize: 12,
        fontWeight: "600",
        minWidth: 40,
      },
      bottomActionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      volumeContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: 160,
      },
      volumeSlider: { flex: 1, marginLeft: 10, height: 30 },
      rightActions: { flexDirection: "row", alignItems: "center", gap: 20 },
      speedButton: {
        backgroundColor: theme.backgroundCard,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 5,
      },
      speedText: { color: theme.text, fontSize: 12, fontWeight: "bold" },
    });
  })();

export default VideoViewer;

