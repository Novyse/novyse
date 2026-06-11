import React from "react";
import { StyleSheet } from "react-native";
import { BlurView, BlurViewProps } from "@react-native-community/blur";

interface NativeBlurProps {
  blurType: BlurViewProps["blurType"];
  blurAmount: number;
  overlayColor?: string;
  reducedTransparencyFallbackColor?: string;
}

export default function NativeBlur({
  blurType,
  blurAmount,
  overlayColor,
  reducedTransparencyFallbackColor,
}: NativeBlurProps) {
  return (
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType={blurType}
      blurAmount={blurAmount}
      downsampleFactor={5}
      pointerEvents="none"
      reducedTransparencyFallbackColor={reducedTransparencyFallbackColor}
      {...(overlayColor ? { overlayColor } : {})}
    />
  );
}
