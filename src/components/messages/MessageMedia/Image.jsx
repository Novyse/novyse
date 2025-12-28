import React, { useState } from "react";
import { Dimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";

const { width: screenWidth } = Dimensions.get("window");
const maxBubbleWidth = screenWidth * 1;

import useUriResolver from "@/src/hooks/file/useUriResolver";

const Image = ({ ref }) => {
  const { uri } = useUriResolver(ref);

  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const onLoadImage = (imageInfo) => {
    const { width: imgWidth, height: imgHeight } = imageInfo.source;
    setWidth(imgWidth);
    setHeight(imgHeight);
    console.log("Loaded image dimensions:", imgWidth, imgHeight);
  };

  return (
    <ExpoImage
      key={uri}
      source={uri}
      style={{
        width: 100,
        height: 100,
        maxWidth: maxBubbleWidth,
      }}
      contentFit="cover"
      onLoad={onLoadImage}
    />
  );
};

export default Image;
