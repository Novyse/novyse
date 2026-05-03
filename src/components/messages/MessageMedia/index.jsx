import React from "react";
import { View, StyleSheet } from "react-native";
import Image from "./Image";
import Video from "./Video";
import { getFileType } from "@/src/utils/storage/file/type";

const MessageMedia = ({ medias, isPending }) => {
  if (!medias || medias.length === 0) return null;

  return (
    <View style={styles.container}>
      {medias.length === 1 ? (
        renderMedia(medias[0], true, isPending)
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
    {renderMedia(item, false, isPending)}
  </View>
);

const renderMedia = (media, isSingle, isPending) => {
  const fileType = getFileType(media.mimeType);
  const { ref, uuid, duration, size } = media;

  if (fileType === "IMAGE") {
    return (
      <Image
        fileRef={ref}
        uuid={uuid}
        size={size}
        isSingle={isSingle}
        isPending={isPending}
      />
    );
  } else if (fileType === "VIDEO") {
    return (
      <Video
        fileRef={ref}
        uuid={uuid}
        size={size}
        duration={duration}
        isSingle={isSingle}
        isPending={isPending}
      />
    );
  }
  return null;
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    minWidth: 200,
    maxHeight: 1000,
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
