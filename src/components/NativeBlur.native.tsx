import React from "react";
import { StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";

interface NativeBlurProps {
  blurType: string;
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
      pointerEvents="none"
      reducedTransparencyFallbackColor={reducedTransparencyFallbackColor}
      {...(overlayColor ? { overlayColor } : {})}
    />
  );
}
