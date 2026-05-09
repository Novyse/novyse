import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import HoverAndPressedButton from "./HoverAndPressedButton";

interface ColorDotProps {
  color: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function ColorDot({ color, selected, onPress }: ColorDotProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <HoverAndPressedButton
      style={[
        styles.colorDot,
        { backgroundColor: color },
        selected && styles.colorDotSelected,
      ]}
      onPress={onPress}
    />
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    colorDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    colorDotSelected: {
      borderWidth: 2,
      borderColor: theme.borderColor,
    },
  });
