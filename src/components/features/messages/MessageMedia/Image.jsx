import { useContext, useState, useCallback, useEffect } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { ThemeContext } from "@/src/context/ThemeContext";
import useUriResolver from "@/src/hooks/file/useUriResolver";
import FileButton from "@/src/components/features/messages/Button/MessageButton";
import ImageViewer from "@/src/components/features/modalSheets/viewer/ImageViewer";
import FileSizeProgress from "@/src/components/features/messages/FileSizeProgress";

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
    const newRatio =
      propAspectRatio || (width && height ? width / height : null);
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
        <View style={styles.imageSizeOverlay}>
          <FileSizeProgress uuid={uuid} size={size} />
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

const createStyle = (theme, isSingle, aspectRatio) =>
  StyleSheet.create({
    container: {
      width: "100%",
      minHeight: 75,
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
    imageSizeOverlay: {
      position: "absolute",
      top: 5,
      left: 5,
      borderRadius: 25,
      backgroundColor: theme.backgroundModalOverlay,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
  });

export default Image;
