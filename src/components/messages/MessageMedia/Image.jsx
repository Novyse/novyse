import React, { useContext, useState, useCallback, useEffect } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { ThemeContext } from "@/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/messages/Button";
import ImageViewer from "@/src/components/modalSheets/viewer/ImageViewer";
import FileSizeProgress from "@/src/components/messages/FileSizeProgress";

// Session cache to remember image ratios during the session
const imageRatioCache = new Map();

const Image = ({
  fileRef,
  uuid,
  size,
  isSingle,
  isPending,
  width,
  height,
  aspectRatio: propAspectRatio,
}) => {
  const { uri } = useUriResolver(fileRef);
  const { theme } = useContext(ThemeContext);

  // Initialize from cache or props
  const [computedRatio, setComputedRatio] = useState(() => {
    if (propAspectRatio) return propAspectRatio;
    if (width && height) return width / height;
    return imageRatioCache.get(uuid) || 1.5; // Default to a standard ratio
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const newRatio = propAspectRatio || (width && height ? width / height : null);
    if (newRatio) {
      setComputedRatio(newRatio);
      imageRatioCache.set(uuid, newRatio);
    }
  }, [propAspectRatio, width, height, uuid]);

  const handleLoad = useCallback(
    (e) => {
      // If we don't have dimensions yet, adapt and cache them
      if (!propAspectRatio && (!width || !height)) {
        const { width: w, height: h } = e.source;
        if (w && h) {
          const ratio = w / h;
          setComputedRatio(ratio);
          imageRatioCache.set(uuid, ratio);
        }
      }
    },
    [propAspectRatio, width, height, uuid],
  );

  const styles = createStyle(theme, isSingle, computedRatio);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={styles.container}>
        <ExpoImage
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          onLoad={handleLoad}
        />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.overlay}>
            <FileButton
              uuid={uuid}
              isPending={isPending}
              isAvailable={!!fileRef}
              isReady={!!uri}
              type={"IMAGE"}
              handleDefaultPress={() => setVisible(true)}
            />
          </View>
        </View>
        <FileSizeProgress uuid={uuid} size={size} style={styles.fileSize} />
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

const createStyle = (theme, isSingle, aspectRatio) =>
  StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor: theme.backgroundColor,
      aspectRatio: isSingle ? aspectRatio || undefined : undefined,
      height: isSingle ? undefined : "100%",
      overflow: "hidden",
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
    fileSize: {
      position: "absolute",
      bottom: 6,
      left: 6,
      color: "white",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      paddingHorizontal: 4,
      borderRadius: 5,
      fontSize: 11,
    },
  });

export default Image;
