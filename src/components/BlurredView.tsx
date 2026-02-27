import React, { useContext, ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { ThemeContext, Theme } from "@/context/ThemeContext";

interface BlurredViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default" | "extraLight";
}

const BlurredView = ({ 
  children, 
  style, 
  intensity = 75, 
  tint 
}: BlurredViewProps) => {
  const { theme } = (useContext(ThemeContext) as any);
  
  return (
    <BlurView
      style={[styles(theme).container, style]}
      intensity={intensity}
      // @ts-ignore - blurMethod is not always recognized but used in original
      blurMethod="dimezisBlurView"
      tint={tint || (theme.blurredViewTint as any)}
    >
      {children}
    </BlurView>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderColor: theme.blurredViewBorder,
      borderWidth: 1,
      borderRadius: 1000,
      overflow: "hidden",
    },
  });

export default BlurredView;
