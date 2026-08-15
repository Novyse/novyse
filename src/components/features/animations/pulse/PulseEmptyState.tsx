import React, { useContext, useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg from "react-native-svg";
import {
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemeContext } from "@/src/context/ThemeContext";
import PulseBlob from "@/src/components/features/animations/pulse/PulseBlob";

type PulseEmptyStateProps = {
  children?: React.ReactNode;
};

const PulseEmptyState = ({ children }: PulseEmptyStateProps) => {
  const { theme } = useContext(ThemeContext);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [pulse]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const { width, height } = size;
  const centerX = width / 2;
  const centerY = height / 2;
  const edgePadding = 36;
  const pulseExpand = 1.12 * 1.1;
  const largestBaseRadius = 370;
  const largestOffsetX = 65 + 28;
  const largestOffsetY = 55 + 26;
  const scaleByHeight =
    (height / 2 - edgePadding) /
    (largestBaseRadius * pulseExpand + largestOffsetY);
  const scaleByWidth =
    (width / 2 - edgePadding) /
    (largestBaseRadius * pulseExpand + largestOffsetX);
  const scale = Math.max(0, Math.min(scaleByHeight, scaleByWidth));
  const radius = (value: number) => value * scale;
  const move = (value: number) => value * scale;

  const colorSoft = theme.secondary;
  const colorMid = theme.secondary;
  const colorDeep = theme.backgroundMain;
  const colorLight = theme.primary;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {width > 0 && height > 0 && (
        <Svg
          pointerEvents="none"
          width={width}
          height={height}
          style={StyleSheet.absoluteFill}
        >
          <PulseBlob
            id="pulse-blob-1"
            x={centerX - 45 * scale}
            y={centerY + 25 * scale}
            baseRadius={radius(370)}
            color1={colorSoft}
            color2={colorMid}
            color3={colorDeep}
            duration={4400}
            moveX={move(28)}
            moveY={move(20)}
            pulse={pulse}
          />
          <PulseBlob
            id="pulse-blob-2"
            x={centerX + 55 * scale}
            y={centerY - 35 * scale}
            baseRadius={radius(350)}
            color1={colorLight}
            color2={colorSoft}
            color3={colorMid}
            duration={3900}
            moveX={move(24)}
            moveY={move(26)}
            pulse={pulse}
          />
          <PulseBlob
            id="pulse-blob-3"
            x={centerX - 25 * scale}
            y={centerY - 55 * scale}
            baseRadius={radius(340)}
            color1={colorLight}
            color2={colorSoft}
            color3={colorMid}
            duration={4800}
            moveX={move(20)}
            moveY={move(18)}
            pulse={pulse}
          />
          <PulseBlob
            id="pulse-blob-4"
            x={centerX + 35 * scale}
            y={centerY + 45 * scale}
            baseRadius={radius(330)}
            color1={colorMid}
            color2={colorDeep}
            color3={colorDeep}
            duration={4100}
            moveX={move(26)}
            moveY={move(22)}
            pulse={pulse}
          />
          <PulseBlob
            id="pulse-blob-5"
            x={centerX - 65 * scale}
            y={centerY - 15 * scale}
            baseRadius={radius(415)}
            color1={colorSoft}
            color2={colorMid}
            color3={colorDeep}
            duration={3700}
            moveX={move(18)}
            moveY={move(14)}
            pulse={pulse}
          />
        </Svg>
      )}
      {children ? (
        <View pointerEvents="box-none" style={styles.content}>
          {children}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PulseEmptyState;
