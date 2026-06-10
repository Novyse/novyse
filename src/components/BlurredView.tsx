import React, { useContext, ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { ThemeContext, Theme } from "@/src/context/ThemeContext";
import Platform, { getOs } from "@/src/utils/device/type";
import NativeBlur from "./NativeBlur";

interface BlurredViewProps {
  children: ReactNode;
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
}: BlurredViewProps & any) => {
  const { theme } = useContext(ThemeContext) as any;
  const containerStyle = [styles(theme, isBorderActive).container, style];

  const isWeb = Platform === "web" || Platform === "desktop";
  const os = getOs();

  if (isWeb) {
    return (
      <View
        style={[
          containerStyle,
          { backdropFilter: `blur(${intensity / 5}px)` } as any,
        ]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  // Native iOS / Android setup
  const blurAmount =
    os === "ios" ? Math.round(intensity / 2.5) : Math.round(intensity / 3);

  const blurType =
    os === "ios"
      ? theme.isDark
        ? "ultraThinMaterialDark"
        : "ultraThinMaterialLight"
      : theme.isDark
        ? "dark"
        : "light";

  const overlayColor = theme.isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(255, 255, 255, 0.3)";

  return (
    <View style={containerStyle} {...rest}>
      <NativeBlur
        blurType={blurType}
        blurAmount={blurAmount}
        overlayColor={os === "android" ? overlayColor : undefined}
      />
      {children}
    </View>
  );
};

const styles = (theme: Theme, isBorderActive: boolean) =>
  StyleSheet.create({
    container: {
      borderColor: isBorderActive ? theme.borderColor : "transparent",
      borderWidth: isBorderActive ? 1 : 0,
      borderRadius: 1000,
      overflow: "hidden",
    },
  });

export default BlurredView;
