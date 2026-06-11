import React, { ReactNode } from "react";
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
}

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

  const os = getOs();

  if (os === "android") {
    return (
      <View style={containerStyle} {...rest} collapsable={false}>
        <View
          style={[
            styles.blurBackground,
            { backgroundColor: theme.backgroundCard },
          ]}
          pointerEvents="none"
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
        style={styles.blurBackground}
        pointerEvents="none"
      />
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
  });

export default BlurredView;
