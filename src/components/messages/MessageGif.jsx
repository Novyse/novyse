import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, Pressable, Linking } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useThemeContext } from "@/src/context/ThemeContext";
import Platform from "@/src/utils/device/type";
import ImageViewer from "@/src/components/features/modalSheets/viewer/ImageViewer";
import messageUtils from "@/src/utils/chat/messageFormat";

const MAX_GIF_WIDTH = 240;
const MAX_GIF_HEIGHT = 320;

const MessageGif = ({ url }) => {
  const { theme } = useThemeContext();
  const mediaUrl = useMemo(() => messageUtils.getGifMediaUrl(url), [url]);
  const [aspectRatio, setAspectRatio] = useState(1.2);
  const [visible, setVisible] = useState(false);

  const styles = useMemo(
    () => createStyle(theme, aspectRatio),
    [theme, aspectRatio],
  );

  const handleLoad = useCallback((e) => {
    const { width: w, height: h } = e.source || {};
    if (w && h) {
      setAspectRatio(w / h);
    }
  }, []);

  const openOriginal = useCallback(() => {
    if (Platform === "web" || Platform === "desktop") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  }, [url]);

  if (!mediaUrl) return null;

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        onLongPress={openOriginal}
        style={styles.container}
      >
        <ExpoImage
          source={{ uri: mediaUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          onLoad={handleLoad}
        />
      </Pressable>
      <ImageViewer
        visible={visible}
        onClose={() => setVisible(false)}
        uri={mediaUrl}
        theme={theme}
        scrollable={false}
        uuid={mediaUrl}
      />
    </>
  );
};

const createStyle = (theme, aspectRatio) => {
  const clampedRatio = Math.min(Math.max(aspectRatio || 1.2, 0.5), 2.5);
  let width = MAX_GIF_WIDTH;
  let height = width / clampedRatio;
  if (height > MAX_GIF_HEIGHT) {
    height = MAX_GIF_HEIGHT;
    width = height * clampedRatio;
  }

  return StyleSheet.create({
    container: {
      width,
      maxWidth: "100%",
      aspectRatio: clampedRatio,
      overflow: "hidden",
      backgroundColor: theme.backgroundSecondary,
      alignSelf: "flex-start",
    },
    image: {
      width: "100%",
      height: "100%",
    },
  });
};

export default React.memo(MessageGif);
