import { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { BlurView } from "expo-blur";

import { Theme } from "@/src/context/ThemeContext";
import { useThemeContext } from "@/src/context/ThemeContext";
import { getOs } from "@/src/utils/device/type";

interface BlurredViewProps {
  children?: ReactNode;
  isBorderActive?: boolean;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Overlay tint drawn above the blur (e.g. status / separator colors with alpha). */
  color?: string;
}

const BlurredView = ({
  children,
  style,
  isBorderActive = true,
  intensity = 50,
  color,
  ...rest
}: BlurredViewProps & Record<string, unknown>) => {
  const { theme, resolvedMode } = useThemeContext();
  const isDark = resolvedMode === "dark";
  const styles = createStyles(theme, isBorderActive, isDark);
  const containerStyle = [styles.container, style];

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const borderRadius = flattenedStyle.borderRadius ?? 1000;
  const borderTopLeftRadius = flattenedStyle.borderTopLeftRadius;
  const borderTopRightRadius = flattenedStyle.borderTopRightRadius;
  const borderBottomLeftRadius = flattenedStyle.borderBottomLeftRadius;
  const borderBottomRightRadius = flattenedStyle.borderBottomRightRadius;

  const radiusStyle = {
    borderRadius,
    ...(borderTopLeftRadius !== undefined && { borderTopLeftRadius }),
    ...(borderTopRightRadius !== undefined && { borderTopRightRadius }),
    ...(borderBottomLeftRadius !== undefined && { borderBottomLeftRadius }),
    ...(borderBottomRightRadius !== undefined && { borderBottomRightRadius }),
  };

  const os = getOs();

  const overlay = color ? (
    <View
      style={[styles.blurBackground, { backgroundColor: color }, radiusStyle]}
    />
  ) : null;

  if (os === "android") {
    return (
      <View style={containerStyle} {...rest} collapsable={false}>
        <View
          style={[
            styles.blurBackground,
            { backgroundColor: color ?? theme.backgroundMain },
            radiusStyle,
          ]}
        />
        {children}
      </View>
    );
  }

  // Web, Desktop, iOS
  return (
    <View style={containerStyle} {...rest} collapsable={false}>
      <BlurView
        intensity={intensity}
        tint={isDark ? "dark" : "light"}
        style={[styles.blurBackground, radiusStyle]}
      />
      {overlay}
      {children}
    </View>
  );
};

const createStyles = (
  theme: Theme,
  isBorderActive: boolean,
  _isDark: boolean,
) =>
  StyleSheet.create({
    container: {
      position: "relative",
      overflow: "hidden",
      borderColor: isBorderActive ? theme.borderColor : "transparent",
      borderWidth: isBorderActive ? 1 : 0,
      borderRadius: 1000,
    },
    blurBackground: {
      ...StyleSheet.absoluteFill,
      zIndex: -1,
      pointerEvents: "none",
    },
  });

export default BlurredView;
