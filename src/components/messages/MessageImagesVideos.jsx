import React, { useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";

const { width: screenWidth } = Dimensions.get("window");
const maxBubbleWidth = screenWidth * 1;

const MessageImagesVideos = ({ mediaUris, uuid, mimeType, size }) => {
  const [mediaDimensions, setMediaDimensions] = useState({});

  const renderGridCell = (item, index, cellStyle) => {
    return (
      <View key={index} style={[styles.gridCell, cellStyle]}>
        <Image source={item} style={styles.media} contentFit="cover" />
      </View>
    );
  };

  const renderSingleImage = (item, index) => {
    const dims = mediaDimensions[index] || { aspectRatio: 1 };
    return (
      <Image
        key={index}
        source={item}
        style={{
          aspectRatio: dims.aspectRatio,
          width: "100%",
          maxWidth: maxBubbleWidth,
        }}
        contentFit="contain"
      />
    );
  };

  const renderTwoImages = () => (
    <View style={styles.twoImagesContainer}>
      <View style={styles.oneRow}>
        {mediaUris
          .slice(0, 2)
          .map((item, index) => renderGridCell(item, index, styles.topCell))}
      </View>
    </View>
  );

  const renderThreeImages = () => (
    <View style={styles.gridContainer}>
      <View style={styles.twoRow}>
        {mediaUris
          .slice(0, 2)
          .map((item, index) => renderGridCell(item, index, styles.topCell))}
      </View>
      <View style={styles.oneWideRow}>
        {renderGridCell(mediaUris[2], 2, styles.bottomCell)}
      </View>
    </View>
  );

  const renderFourImages = () => (
    <View style={styles.gridContainer}>
      <View style={styles.twoRow}>
        {mediaUris
          .slice(0, 2)
          .map((item, index) => renderGridCell(item, index, styles.topCell))}
      </View>
      <View style={styles.twoRow}>
        {mediaUris
          .slice(2, 4)
          .map((item, index) =>
            renderGridCell(item, index + 2, styles.topCell)
          )}
      </View>
    </View>
  );

  const numImages = mediaUris.length;
  let gridContent;

  if (numImages === 1) {
    gridContent = renderSingleImage(mediaUris[0], 0);
  } else if (numImages === 2) {
    gridContent = renderTwoImages();
  } else if (numImages === 3) {
    gridContent = renderThreeImages();
  } else if (numImages === 4) {
    gridContent = renderFourImages();
  } else {
    gridContent = null;
  }

  return <View style={styles.bubble}>{gridContent}</View>;
};

export default MessageImagesVideos;

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    borderRadius: 12,
    minWidth: 200,
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
  gridCell: {},
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
