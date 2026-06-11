import React, { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { Theme } from "@/src/context/ThemeContext";
import { useThemeContext } from "@/src/context/ThemeContext";
import Platform, { getOs } from "@/src/utils/device/type";
import NativeBlur from "./NativeBlur";

interface BlurredViewProps {
  children?: ReactNode;
  isBorderActive?: boolean;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

const getOverlayColor = (isDark: boolean) =>
  isDark ? "rgba(10, 59, 133, 0.35)" : "rgba(255, 255, 255, 0.35)";

const BlurredView = ({
  children,
  style,
  isBorderActive = true,
  intensity = 50,
  ...rest
}: BlurredViewProps & Record<string, unknown>) => {
  const { theme, resolvedMode } = useThemeContext();
  const isDark = resolvedMode === "dark";
  const styles = createStyles(theme, isBorderActive, isDark);
  const containerStyle = [styles.container, style];
  const overlayColor = getOverlayColor(isDark);
  const blurPx = Math.round(intensity / 5);

  if (Platform === "web" || Platform === "desktop") {
    return (
      <View style={containerStyle} {...rest}>
        <View
          style={[
            styles.blurBackground,
            {
              backgroundColor: overlayColor,
              backdropFilter: `blur(${blurPx}px) saturate(1.05)`,
              WebkitBackdropFilter: `blur(${blurPx}px) saturate(1.05)`,
            } as ViewStyle,
          ]}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  const os = getOs();
  const blurAmount =
    os === "ios" ? Math.round(intensity / 2.5) : Math.round(intensity / 3);

  const blurType =
    os === "ios" ? (isDark ? "dark" : "light") : isDark ? "dark" : "light";

  return (
    <View style={containerStyle} {...rest} collapsable={false}>
      <View
        style={styles.blurBackground}
        pointerEvents="none"
        collapsable={false}
      >
        <NativeBlur
          blurType={blurType}
          blurAmount={blurAmount}
          overlayColor={os === "android" ? overlayColor : undefined}
          reducedTransparencyFallbackColor={theme.backgroundMain}
        />
        {os === "ios" && (
          <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
        )}
      </View>
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
      zIndex: 0,
    },
    overlay: {
      ...StyleSheet.absoluteFill,
    },
  });

export default BlurredView;
