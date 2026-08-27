import { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Platform, Modal, StatusBar } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
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
  withTiming,
  clamp,
  runOnJS,
} from "react-native-reanimated";
import * as ScreenOrientation from "expo-screen-orientation";
import { useScreen } from "@/src/context/ScreenContext";
import useDownload from "@/src/hooks/file/useDownload";
import useShare from "@/src/hooks/chat/useShare";
import PlatformType from "@/src/utils/device/type";
import Icon from "@/src/components/ui/icon/Icon";

const ImageViewer = ({ visible, onClose, uri, theme, uuid }) => {
  const { downloadFile } = useDownload();
  const { shareFileOrText } = useShare();
  const isMobile = PlatformType === "mobile";
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { isSmallScreen } = useScreen();
  const containerRef = useRef(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const toggleControls = () => setControlsVisible((prev) => !prev);

  // Fullscreen and Orientation handling
  useEffect(() => {
    if (PlatformType === "web") {
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

  const toggleFullscreen = async () => {
    if (PlatformType === "web") {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    } else {
      const nextState = !isFullscreen;
      setIsFullscreen(nextState);
      StatusBar.setHidden(nextState, "fade");
      if (nextState) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      } else {
        await ScreenOrientation.unlockAsync();
      }
    }
  };

  const resetZoom = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleClose = () => {
    resetZoom();
    if (isFullscreen && PlatformType !== "web") {
      setIsFullscreen(false);
      StatusBar.setHidden(false, "fade");
      ScreenOrientation.unlockAsync();
    }
    onClose();
  };

  // GESTO PINCH (Zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // GESTO PAN (Spostamento)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1.1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // GESTO TAP
  const tapGesture = Gesture.Tap().onEnd(() => {
    if (scale.value > 1.1) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    } else {
      runOnJS(toggleControls)();
    }
  });

  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    tapGesture,
  );

  const onWheel = (event) => {
    if (Platform.OS === "web") {
      const delta = event.deltaY * -0.001;
      const newScale = clamp(scale.value + delta, 1, 8);
      scale.value = newScale;
      savedScale.value = newScale;
      if (newScale <= 1.05) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleShare = async () => {
    if (!uuid && !uri) return;
    await shareFileOrText({ uuid, uri });
  };

  const handleDownload = async () => {
    if (!uuid && !uri) return;
    if (uuid) {
      await downloadFile({ uuid });
    }
  };

  const styles = createStyle(theme, isFullscreen);

  if (!visible || !uri) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        <View
          ref={containerRef}
          style={styles.container}
          // @ts-ignore
          onWheel={onWheel}
        >
          {controlsVisible && (
            <SafeAreaView style={styles.headerSafeArea}>
              <View style={styles.header}>
                <Icon
                  name="Cancel01Icon"
                  onPress={handleClose}
                  color={theme.icon}
                  hoverColor={theme.iconHover}
                />
                <View style={styles.rightButtons}>
                  <Icon
                    name="Download01Icon"
                    onPress={handleDownload}
                    color={theme.icon}
                    hoverColor={theme.iconHover}
                  />
                  <Icon
                    name={
                      isFullscreen ? "ArrowShrink02Icon" : "ArrowExpand01Icon"
                    }
                    onPress={toggleFullscreen}
                    color={theme.icon}
                    hoverColor={theme.iconHover}
                  />
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
            </SafeAreaView>
          )}

          <View style={styles.imageContainer}>
            <GestureDetector gesture={composedGestures}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                  source={{ uri }}
                  style={styles.image}
                  contentFit="contain"
                  transition={0}
                  //@ts-ignore
                  draggable={false}
                />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const createStyle = (theme, isFullscreen) => {
  return StyleSheet.create({
    modalRoot: {
      flex: 1,
      backgroundColor: theme.backgroundModalOverlay,
    },
    container: {
      flex: 1,
      backgroundColor: theme.backgroundModalOverlay,
      overflow: "hidden",
      ...Platform.select({ web: { cursor: "grab" } }),
    },
    headerSafeArea: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    rightButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    imageContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
    imageWrapper: {
      width: isFullscreen ? "100%" : "85%",
      height: isFullscreen ? "100%" : "85%",
      justifyContent: "center",
      alignItems: "center",
      ...Platform.select({
        web: {
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        },
      }),
    },
    image: {
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    },
  });
};

export default ImageViewer;
