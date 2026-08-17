import React from "react";
import { View, StyleSheet } from "react-native";
import Platform from "@/src/utils/device/type";

interface ScreenRecordingPreviewProps {
  isScreenRecording: boolean;
  activeStream: any;
}

const ScreenRecordingPreview: React.FC<ScreenRecordingPreviewProps> = ({
  isScreenRecording,
  activeStream,
}) => {
  const styles = createStyle();

  if (
    !isScreenRecording ||
    !activeStream ||
    (Platform !== "web" && Platform !== "desktop")
  ) {
    return null;
  }

  return (
    <View style={styles.container}>
      {React.createElement("video", {
        autoPlay: true,
        muted: true,
        style: {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          borderRadius: 10,
        },
        ref: (ref: any) => {
          if (ref && ref.srcObject !== activeStream) {
            ref.srcObject = activeStream;
          }
        },
      })}
    </View>
  );
};

const createStyle = () =>
  StyleSheet.create({
    container: {
      width: "100%",
      maxWidth: 250,
      height: 140,
      marginBottom: 10,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: "transparent",
      alignSelf: "center",
    },
  });

export default ScreenRecordingPreview;
