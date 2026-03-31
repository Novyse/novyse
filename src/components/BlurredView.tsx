import React, { useContext, ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { ThemeContext, Theme } from "@/context/ThemeContext";

interface BlurredViewProps {
  children: ReactNode;
  isBorderActive?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BlurredView = ({ children, style, isBorderActive = true, ...rest }: BlurredViewProps & any) => {
  const { theme } = useContext(ThemeContext) as any;

  return (
    <View style={[styles(theme, isBorderActive).container, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = (theme: Theme, isBorderActive: boolean) =>
  StyleSheet.create({
    container: {
      borderColor: isBorderActive ? theme.blurredViewBorder : "transparent",
      borderWidth: isBorderActive ? 1 : 0,
      borderRadius: 1000,
      overflow: "hidden",
      backgroundColor: theme.backgroundMainGradient[0],
    },
  });

export default BlurredView;