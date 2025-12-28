import React from "react";
import { Dimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

import useUriResolver from "@/src/hooks/file/useUriResolver";

const { width: screenWidth } = Dimensions.get("window");
const maxBubbleWidth = screenWidth * 1;

const Video = ({ ref }) => {
  const { uri } = useUriResolver(ref);

  const playerVideo = useVideoPlayer(uri, (player) => {
    player.play();
  });

  return (
    <VideoView
      key={uri}
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
export default Video;
