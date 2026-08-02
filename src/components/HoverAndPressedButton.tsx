import React, { useContext } from "react";
import { Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Theme, ThemeContext } from "@/src/context/ThemeContext";

interface HoverAndPressedButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onContextMenu?: () => void;
  style?: StyleProp<ViewStyle>;
  hoveredStyle?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
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

  const flatStyle = StyleSheet.flatten(style);
  const flatHoveredStyle = StyleSheet.flatten(hoveredStyle);
  const flatPressedStyle = StyleSheet.flatten(pressedStyle);

  return (
    <PressableAny
      style={({ pressed, hovered }: any) => [
        styles.baseContainer,
        flatStyle,
        hovered && hasAction && styles.baseHovered,
        hovered && hasAction && flatHoveredStyle,
        pressed && hasAction && styles.basePressed,
        pressed && hasAction && flatPressedStyle,
        disabled && styles.disabled,
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
