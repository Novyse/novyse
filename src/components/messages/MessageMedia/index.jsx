import React from "react";
import { View, StyleSheet } from "react-native";

import Image from "./Image";
import Video from "./Video";

import { getFileType } from "@/src/utils/storage/file/type";

const MessageMedia = ({ medias }) => {
  return (
    <View style={styles.bubble}>
      {medias.length === 1 ? (
        renderMedia(medias[0])
      ) : medias.length === 2 ? (
        <View style={styles.twoImagesContainer}>
          <View style={styles.oneRow}>
            {medias
              .slice(0, 2)
              .map((item, index) =>
                renderGridCell(item, index, styles.topCell)
              )}
          </View>
        </View>
      ) : medias.length === 3 ? (
        <View style={styles.gridContainer}>
          <View style={styles.twoRow}>
            {medias
              .slice(0, 2)
              .map((item, index) =>
                renderGridCell(item, index, styles.topCell)
              )}
          </View>
          <View style={styles.oneWideRow}>
            {renderGridCell(medias[2], 2, styles.bottomCell)}
          </View>
        </View>
      ) : medias.length > 3 ? (
        <View style={styles.gridContainer}>
          <View style={styles.twoRow}>
            {medias
              .slice(0, 2)
              .map((item, index) =>
                renderGridCell(item, index, styles.topCell)
              )}
          </View>
          <View style={styles.twoRow}>
            {medias
              .slice(2, 4)
              .map((item, index) =>
                renderGridCell(item, index + 2, styles.topCell)
              )}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const renderGridCell = (item, index, cellStyle) => {
  return (
    <View key={index} style={[styles.gridCell, cellStyle]}>
      {renderMedia(item)}
    </View>
  );
};

const renderMedia = (media) => {
  const fileType = getFileType(media.mimeType);
  const fileRef = media.ref;
  if (fileType === "IMAGE") {
    return <Image fileRef={fileRef} />;
  } else if (fileType === "VIDEO") {
    return <Video fileRef={fileRef} />;
  }
  return null;
};

export default MessageMedia;

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    borderRadius: 12,
    width: "100%",
  },
  twoImagesContainer: {
    width: "100%",
    aspectRatio: 2,
    borderRadius: 8,
  },
  gridContainer: {
    flexDirection: "column",
    aspectRatio: 1,
    width: "100%",
    borderRadius: 8,
  },
  twoRow: {
    flexDirection: "row",
    height: "50%",
    gap: 5,
    marginBottom: 5,
  },
  oneRow: {
    flexDirection: "row",
    height: "100%",
    gap: 5,
    marginBottom: 5,
  },
  oneWideRow: {
    flexDirection: "row",
    height: "50%",
  },
  topCell: {
    flex: 1,
  },
  bottomCell: {
    flex: 1,
  },
  media: {
    width: "100%",
    height: "100%",
  },
});
