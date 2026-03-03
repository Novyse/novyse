import React, { useContext, useState } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { ThemeContext } from "@/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/messages/Button";
import ImageViewer from "@/src/components/modalSheets/viewer/ImageViewer";

const Image = ({ fileRef, uuid, isSingle }) => {
  const { uri } = useUriResolver(fileRef);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme, isSingle);

  const [visible, setVisible] = useState(false);

  const handlePress = () => {
    if (!uri) return;
    setVisible(true);
  };

  return (
    <>
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
      <ImageViewer
        visible={visible}
        onClose={() => setVisible(false)}
        uri={uri}
        theme={theme}
        scrollable={false}
        uuid={uuid}
      />
    </>
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
