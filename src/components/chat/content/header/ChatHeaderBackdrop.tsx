import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeContext } from "@/src/context/ThemeContext";

interface ChatHeaderBackdropProps {
  height: number;
}

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const FADE_EXTENSION = 10;

const ChatHeaderBackdrop = ({ height }: ChatHeaderBackdropProps) => {
  const { theme } = useThemeContext();

  if (height <= 0) {
    return null;
  }

  const gradientColors: [string, string] = [
    withAlpha(theme.backgroundMain, 0.9),
    withAlpha(theme.backgroundMain, 0),
  ];

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.backdrop, { height: height + FADE_EXTENSION }]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
  },
});

export default ChatHeaderBackdrop;
