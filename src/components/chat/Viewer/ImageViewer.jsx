import React, { useState } from "react";
import { StyleSheet, View, Pressable, Share, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
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
import useDownload from "@/src/hooks/file/useDownload";

const ImageViewer = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;
  const uuid = params.uuid || null;

  const { downloadFile } = useDownload();
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
    if (!uri) return;
    try {
      await Share.share({ url: uri, message: uri });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

  const handleDownload = async () => {
    if (!uuid) return;
    await downloadFile({ uuid });
  };

  if (!uri) return <View style={styles.container} />;

  return (
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
              // FIX WEB: Impedisce il drag nativo del browser
              //@ts-ignore
              draggable={false}
            />
          </Animated.View>
        </GestureDetector>

        {controlsVisible && (
          <SafeAreaView style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="close" size={28} color="white" />
            </Pressable>
            <View style={styles.rightButtons}>
              {uuid && (
                <Pressable onPress={handleDownload} style={styles.iconButton}>
                  <Ionicons name="download-outline" size={26} color="white" />
                </Pressable>
              )}
              <Pressable onPress={handleShare} style={styles.iconButton}>
                <Ionicons name="share-outline" size={26} color="white" />
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
    ...Platform.select({ web: { cursor: "grab" } }),
  },
  imageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Impedisce la selezione dell'immagine su web
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ImageViewer;
