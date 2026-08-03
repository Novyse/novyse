import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

import BlurredView from "./BlurredView";
import HoverAndPressedButton from "./HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";

interface FloatingButtonProps {
  onPress: () => void;
  iconName: string;
  size?: number;
  width?: number;
  height?: number;
  position?: { bottom?: number; right?: number; left?: number; top?: number };
}

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  iconName,
  size = 24,
  width = 45,
  height = 45,
  position = { bottom: 25, right: 20 },
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(width, height, theme);
  return (
    <HoverAndPressedButton
      style={[styles.container, position]}
      onPress={onPress}
    >
      <BlurredView style={styles.blurView}>
        <Icon name={iconName} size={size} />
      </BlurredView>
    </HoverAndPressedButton>
  );
};

const createStyle = (width: number, height: number, theme: any) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      width: width,
      height: height,
      borderWidth: 1,
      borderColor: theme.borderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    blurView: {
      width: width,
      height: height,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 999,
    },
  });

export default FloatingButton;
