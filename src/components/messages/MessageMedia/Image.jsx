import React, { useContext } from "react";
import { StyleSheet, Pressable, View, ActivityIndicator } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";

import useUriResolver from "@/src/hooks/file/useUriResolver";

import FileButton from "@/src/components/messages/Button";

const Image = ({ fileRef, uuid }) => {
  const router = useRouter();
  const { uri } = useUriResolver(fileRef);

  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handlePress = () => {
    if (!uri) return;

    router.push({
      pathname: "/chat/ImageViewer",
      params: {
        uri: encodeURIComponent(uri),
      },
    });
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <ExpoImage
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      {/* Da eliminare l'intera view e rifare con non ho capito @Matt3opower */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <FileButton
          uuid={uuid}
          isAvailable={!!fileRef}
          isReady={!!uri}
          type={"IMAGE"}
          handleDefaultPress={handlePress}
        />
      </View>
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
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
      backgroundColor: theme.backgroundColor,
    },
    placeholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f0f0f0",
      minHeight: 100,
    },
  });

export default Image;
