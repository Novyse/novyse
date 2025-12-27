import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Image, useImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { getFileType } from "@/src/utils/storage/file/type";

import useUriResolver from "@/src/hooks/file/useUriResolver";

const { width: screenWidth } = Dimensions.get("window");
const maxBubbleWidth = screenWidth * 1;

const MessageImagesVideos = ({ mediaRefs, uuid, mimeType, size }) => {
  const [mediaDimensions, setMediaDimensions] = useState({});

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const onLoadImage = (imageInfo) => {
    const { width: imgWidth, height: imgHeight } = imageInfo.source;
    setWidth(imgWidth);
    setHeight(imgHeight);
    console.log("Loaded image dimensions:", imgWidth, imgHeight);
  };

  const { uri: mediaUri } = useUriResolver(mediaRefs[0]);

  const type = getFileType(mimeType);
  const isImage = type === "IMAGE";
  const mediaUris = [mediaUri]; // Per ora supporta un solo media, ma in futuro si può estendere

  const renderGridCell = (item, index, cellStyle) => {
    return (
      <View key={index} style={[styles.gridCell, cellStyle]}>
        <Image source={item} style={styles.media} contentFit="cover" />
      </View>
    );
  };

  const playerVideo = useVideoPlayer(mediaUris[0], (player) => {
    player.play();
  });

  const renderSingleImage = (item, index) => {
    const dims = mediaDimensions[index] || { aspectRatio: 1 };
    return isImage ? (
      <Image
        key={index}
        source={item}
        style={{
          width: 100,
          height: 100,
          maxWidth: maxBubbleWidth,
        }}
        contentFit="cover"
        onLoad={onLoadImage}
      />
    ) : (
      <VideoView
        key={index}
        player={playerVideo}
        style={{
          maxWidth: maxBubbleWidth,
        }}
        useNativeControls
        allowsFullscreen
        allowsPictureInPicture
        resizeMode="contain"
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
