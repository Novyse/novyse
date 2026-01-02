import React from "react";
import { StyleSheet, Pressable, View, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import useUriResolver from "@/src/hooks/file/useUriResolver";

const Image = ({ fileRef }) => {
  const router = useRouter();
  const { uri, isLoading } = useUriResolver(fileRef);

  const handlePress = () => {
    if (!uri) return;
    
    router.push({
      pathname: "/chat/ImageViewer",
      params: { 
        uri: encodeURIComponent(uri) 
      },
    });
  };


  if (!uri || isLoading) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <ExpoImage
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%", 
    height: "100%",
    overflow: "hidden",
    borderRadius: 4,
  },
  image: {
    width: 150,
    height: 150,
    backgroundColor: "#f0f0f0",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    minHeight: 100,
  },
});

export default Image;