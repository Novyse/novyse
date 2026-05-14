import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_MEDIA_WIDTH = 240;
const MAX_MEDIA_HEIGHT = 320;

import Image from "./Image";
import Video from "./Video";
import { getFileType } from "@/src/utils/storage/file/type";

const MessageMedia = ({ medias, isPending }) => {
  if (!medias || medias.length === 0) return null;

  const isSingle = medias.length === 1;
  const firstMedia = medias[0];

  let singleWidth = MAX_MEDIA_WIDTH;
  let finalMediaRatio = null;

  if (isSingle) {
    const originalWidth = firstMedia.width;
    const originalHeight = firstMedia.height;

    if (originalWidth && originalHeight) {
      const widthScale = MAX_MEDIA_WIDTH / originalWidth;
      const heightScale = MAX_MEDIA_HEIGHT / originalHeight;
      const scale = Math.min(1, widthScale, heightScale);

      singleWidth = originalWidth * scale;
      finalMediaRatio = originalWidth / originalHeight;
    } else {
      // For existing messages, we start with a standard width but NO fixed ratio
      // This allows the child to expand to its natural shape once loaded
      singleWidth = 220;
    }
  }

  return (
    <View
      style={[
        styles.container,
        isSingle && {
          width: singleWidth,
          // Only apply aspectRatio if we are SURE about it
          // Otherwise, let the child component define the height
          aspectRatio: finalMediaRatio || undefined,
          maxWidth: "100%",
          minHeight: 75,
        },
      ]}
    >
      {isSingle ? (
        renderMedia(medias[0], true, isPending, finalMediaRatio)
      ) : (
        <View style={styles.grid}>
          <View style={styles.row}>
            {medias
              .slice(0, 2)
              .map((item, index) => renderGridCell(item, index, isPending))}
          </View>
          {medias.length > 2 && (
            <View style={styles.row}>
              {medias.length === 3
                ? renderGridCell(medias[2], 2, isPending)
                : medias
                    .slice(2, 4)
                    .map((item, index) =>
                      renderGridCell(item, index + 2, isPending),
                    )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const renderGridCell = (item, index, isPending) => (
  <View key={index} style={styles.cell}>
    {renderMedia(item, false, isPending, null)}
  </View>
);

const renderMedia = (media, isSingle, isPending, aspectRatio) => {
  const fileType = getFileType(media.mimeType);
  const { ref, uuid, duration, size, width, height } = media;

  if (fileType === "IMAGE") {
    return (
      <Image
        fileRef={ref}
        uuid={uuid}
        size={size}
        width={width}
        height={height}
        isSingle={isSingle}
        isPending={isPending}
        aspectRatio={aspectRatio}
      />
    );
  } else if (fileType === "VIDEO") {
    return (
      <Video
        fileRef={ref}
        uuid={uuid}
        size={size}
        width={width}
        height={height}
        duration={duration}
        isSingle={isSingle}
        isPending={isPending}
        aspectRatio={aspectRatio}
      />
    );
  }
  return null;
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  grid: {
    width: "100%",
    gap: 2,
  },
  row: {
    flexDirection: "row",
    gap: 2,
    height: 150,
  },
  cell: {
    flex: 1,
    minWidth: 100,
  },
});

export default MessageMedia;
