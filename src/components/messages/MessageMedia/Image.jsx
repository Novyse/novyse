import React, { useContext } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/messages/Button";

const Image = ({ fileRef, uuid, isSingle }) => {
  const router = useRouter();
  const { uri } = useUriResolver(fileRef);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSingle);

  const handlePress = () => {
    if (!uri) return;
    router.push({
      pathname: "/chat/ImageViewer",
      params: { uri: encodeURIComponent(uri) },
    });
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <ExpoImage
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <FileButton
            uuid={uuid}
            isAvailable={!!fileRef}
            isReady={!!uri}
            type={"IMAGE"}
            handleDefaultPress={handlePress}
          />
        </View>
      </View>
    </Pressable>
  );
};

const createStyle = (theme, isSingle) =>
  StyleSheet.create({
    container: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.backgroundColor,
      aspectRatio: isSingle ? 3 / 2 : undefined,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default Image;