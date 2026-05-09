import React, { useState } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
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
import ModalBase from "../ModalBase";
import { useScreen } from "@/context/ScreenContext";
import useDownload from "@/src/hooks/file/useDownload";
import useShare from "@/src/hooks/chat/useShare";
import PlatformType from "@/src/utils/device/type";
import Icon from "@/src/components/Icon";

const ImageViewer = ({ visible, onClose, uri, theme, uuid }) => {
  const { downloadFile } = useDownload();
  const { shareFileOrText } = useShare();
  const isMobile = PlatformType === "mobile";
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const { isSmallScreen } = useScreen();

  const styles = createStyle(theme, screenHeight, screenWidth, isSmallScreen);

  const [controlsVisible, setControlsVisible] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const toggleControls = () => setControlsVisible(!controlsVisible);

  // GESTO PINCH (Zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        // Effetto calamita alla posizione originale
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
    if (!uuid) return;
    await downloadFile({ uuid });
  };

  if (!uri) return <View style={styles.container} />;

  return (
    <ModalBase
      visible={visible}
      onClose={onClose}
      theme={theme}
      scrollable={false}
      hideCloseX={true}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={styles.container}
          // @ts-ignore
          onWheel={onWheel}
        >
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

          {controlsVisible && (
            <SafeAreaView style={styles.header}>
              <Icon name="Cancel01Icon" onPress={onClose} />
              <View style={styles.rightButtons}>
                {uuid && (
                  <Icon name="Download01Icon" onPress={handleDownload} />
                )}
                {isMobile && <Icon name="Share01Icon" onPress={handleShare} />}
              </View>
            </SafeAreaView>
          )}
        </View>
      </GestureHandlerRootView>
    </ModalBase>
  );
};

const createStyle = (theme, screenHeight, screenWidth, isSmallScreen) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
      overflow: "hidden",
      minHeight: isSmallScreen ? screenHeight : screenHeight * 0.7,
      minWidth: isSmallScreen ? screenWidth : screenWidth * 0.7,
      ...Platform.select({ web: { cursor: "grab" } }),
    },
    imageWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      minHeight: isSmallScreen ? "100%" : screenHeight * 0.7,
      minWidth: isSmallScreen ? "100%" : screenWidth * 0.7,
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
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 10,
      zIndex: 100,
    },
    rightButtons: {
      flexDirection: "row",
      gap: 10,
    },
  });

export default ImageViewer;
