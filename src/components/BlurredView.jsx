import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext } from "@/context/ThemeContext";

const BlurredView = ({
  children,
  style,
  intensity = 75,
  tint,
}) => {
  const { theme } = useContext(ThemeContext);

  return (
    <BlurView
      style={[styles(theme).container, style]}
      intensity={intensity}
      experimentalBlurMethod="dimezisBlurView"
      tint={tint || theme.blurredViewTint}
    >
      {children}
    </BlurView>
  );
};

const styles = (theme) =>
  StyleSheet.create({
    container: {
      borderColor: theme.blurredViewBorder,
      borderWidth: 1,
      borderRadius: 1000,
    },
  });

export default BlurredView;
