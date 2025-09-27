import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

// Componente riutilizzabile HoverAndPressedButton
const HoverAndPressedButton = ({
  children,
  onPress,
  style = {}, // Stili base per il container
  hoveredStyle = {}, // Stili per stato hovered
  pressedStyle = {}, // Stili per stato pressed
  disabled
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.baseContainer,
        style, // Stili personalizzati passati come prop
        hovered && { ...styles.baseHovered, ...hoveredStyle },
        pressed && { ...styles.basePressed, ...pressedStyle },
      ]}
      onPress={onPress}
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
      borderRadius: "50%"
    },
    baseHovered: {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      cursor: "pointer",
    },
    basePressed: {
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      opacity: 0.9,
    },
  });

export default HoverAndPressedButton;
