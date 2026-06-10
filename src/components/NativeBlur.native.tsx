import React from "react";
import { StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";

interface NativeBlurProps {
  blurType: any;
  blurAmount: number;
  overlayColor?: string;
}

export default function NativeBlur({
  blurType,
  blurAmount,
  overlayColor,
}: NativeBlurProps) {
  return (
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType={blurType}
      blurAmount={blurAmount}
      {...(overlayColor ? { overlayColor } : {})}
    />
  );
}
