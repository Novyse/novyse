import React, { useContext } from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Theme, ThemeContext } from "@/src/context/ThemeContext";

interface HoverAndPressedButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onContextMenu?: () => void;
  style?: ViewStyle | ViewStyle[];
  hoveredStyle?: ViewStyle | ViewStyle[];
  pressedStyle?: ViewStyle | ViewStyle[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
}

const HoverAndPressedButton = ({
  children,
  onPress,
  onLongPress,
  onContextMenu,
  style = {},
  hoveredStyle = {},
  pressedStyle = {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  onPressIn = () => {},
  onPressOut = () => {},
  disabled = false,
}: HoverAndPressedButtonProps) => {
  const { theme } = useContext(ThemeContext) as any;
  const styles = createStyle(theme);

  const PressableAny = Pressable as any;

  const hasAction = onPress || onLongPress || onContextMenu;

  return (
    <PressableAny
      style={({ pressed, hovered }: any) => [
        styles.baseContainer as ViewStyle,
        style as ViewStyle,
        hovered &&
          hasAction &&
          ({ ...styles.baseHovered, ...(hoveredStyle as object) } as any),
        pressed &&
          hasAction &&
          ({ ...styles.basePressed, ...(pressedStyle as object) } as any),
        disabled && (styles.disabled as ViewStyle),
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onContextMenu={onContextMenu as any}
      onPressIn={onPressIn as any}
      onPressOut={onPressOut as any}
      onMouseEnter={onMouseEnter as any}
      onMouseLeave={onMouseLeave as any}
      disabled={disabled}
    >
      {children}
    </PressableAny>
  );
};

const createStyle = (theme: Theme) =>
  StyleSheet.create({
    baseContainer: {
      padding: 5,
      borderRadius: "50%",
      transition: "background-color 0.2s ease",
    } as any,
    baseHovered: {
      backgroundColor: theme.iconHovered,
      cursor: "pointer",
    } as any,
    basePressed: {
      backgroundColor: theme.iconPressed,
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    } as any,
  });

export default HoverAndPressedButton;
