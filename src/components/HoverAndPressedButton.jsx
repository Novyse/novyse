import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

const HoverAndPressedButton = ({
  children,
  onPress,
  onLongPress = () => {},
  onContextMenu = () => {},
  style = {},
  hoveredStyle = {},
  pressedStyle = {},
  onMouseEnter = () => {},
  onMouseLeave = () => {},
  disabled,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.baseContainer,
        style,
        hovered && { ...styles.baseHovered, ...hoveredStyle },
        pressed && { ...styles.basePressed, ...pressedStyle },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
    >
      {children}
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    baseContainer: {
      padding: 5,
      borderRadius: "50%",
      transition: "background-color 0.2s ease",
    },
    baseHovered: {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      cursor: "pointer",
    },
    basePressed: {
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      opacity: 0.9,
    },
    disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  });

export default HoverAndPressedButton;
