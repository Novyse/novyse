import React, { useState } from "react";
import { StyleSheet, View, Pressable, Share, Dimensions, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const ImageViewer = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const uri = params.uri ? decodeURIComponent(params.uri) : null;
  
  // Per nascondere l'header quando si fa zoom o tap
  const [controlsVisible, setControlsVisible] = useState(true);

  console.log("🍆🍆🍆");

  const handleShare = async () => {
    if (!uri) return;
    try {
      await Share.share({ url: uri, message: uri });
    } catch (error) {
      console.log("Error sharing", error);
    }
  };

  const toggleControls = () => {
    setControlsVisible(!controlsVisible);
  };

  if (!uri) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        maximumZoomScale={3} // Zoom massimo 3x
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        centerContent={true}
      >
        <Pressable onPress={toggleControls} style={styles.imageWrapper}>
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        </Pressable>
      </ScrollView>

      {/* Header Overlay (Chiudi e Condividi) */}
      {controlsVisible && (
        <SafeAreaView style={styles.header} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="white" />
          </Pressable>

          <Pressable onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={26} color="white" />
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: width,
    height: height,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height,
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