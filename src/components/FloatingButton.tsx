import React from "react";
import { StyleSheet } from "react-native";

import BlurredView from "./BlurredView";
import HoverAndPressedButton from "./HoverAndPressedButton";
import Icon from "./Icon";

interface FloatingButtonProps {
  onPress: () => void;
  iconName: string;
  size?: number;
  width?: number;
  height?: number;
  position?: { bottom?: number; right?: number; left?: number; top?: number };
}

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  iconName,
  size = 24,
  width = 60,
  height = 60,
  position = { bottom: 25, right: 20 },
}) => {
  const styles = createStyle(width, height);
  return (
    <HoverAndPressedButton
      style={[styles.container, position]}
      onPress={onPress}
    >
      <BlurredView intensity={50} tint="dark" style={styles.blurView}>
        <Icon name={iconName} size={size} color="#ffffff" />
      </BlurredView>
    </HoverAndPressedButton>
  );
};

const createStyle = (width: number, height: number) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      width: width,
      height: height,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
      justifyContent: "center",
      alignItems: "center",
    },
    blurView: {
      width: width,
      height: height,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 999,
      backgroundColor: "#3660ba68"
    },
  });

export default FloatingButton;
