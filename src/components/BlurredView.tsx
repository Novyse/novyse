import React, { useContext, ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp, View } from "react-native";
import { ThemeContext, Theme } from "@/context/ThemeContext";

interface BlurredViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const BlurredView = ({ children, style, ...rest }: BlurredViewProps & any) => {
  const { theme } = useContext(ThemeContext) as any;

  return (
    <View style={[styles(theme).container, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderColor: theme.blurredViewBorder,
      borderWidth: 1,
      borderRadius: 1000,
      overflow: "hidden",
      backgroundColor: theme.backgroundMainGradient[0],
    },
  });

export default BlurredView;