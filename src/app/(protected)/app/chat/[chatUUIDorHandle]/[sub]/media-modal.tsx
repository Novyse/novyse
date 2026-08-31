import { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useThemeContext } from "@/src/context/ThemeContext";
import { useScreen } from "@/src/context/ScreenContext";
import ImageViewer from "@/src/components/features/modalSheets/viewer/ImageViewer";
import VideoViewer from "@/src/components/features/modalSheets/viewer/VideoViewer";

export default function MediaModalScreen() {
  const { uri, uuid, type } = useLocalSearchParams<{
    uri?: string;
    uuid?: string;
    type?: "IMAGE" | "VIDEO";
  }>();

  const { theme } = useThemeContext();
  const { isSmallScreen } = useScreen();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const mediaType = type === "VIDEO" ? "VIDEO" : "IMAGE";

  const hasValidMedia = !!uri && !!uuid;

  useEffect(() => {
    if (!hasValidMedia) {
      router.back();
    }
  }, [hasValidMedia]);

  const styles = createStyle();

  if (!hasValidMedia || !uri) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden={true} translucent />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
      />

      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          {mediaType === "VIDEO" ? (
            <VideoViewer
              visible={isMounted}
              onClose={() => router.back()}
              uri={String(uri)}
              theme={theme}
              uuid={String(uuid)}
            />
          ) : (
            <ImageViewer
              visible={isMounted}
              onClose={() => router.back()}
              uri={String(uri)}
              theme={theme}
              uuid={String(uuid)}
            />
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const createStyle = () =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "black",
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    safeArea: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
  });
