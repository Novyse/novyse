import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

// Componente riutilizzabile HoverAndPressedButton
const HoverAndPressedButton = ({
  children,
  onPress,
  containerStyle = {}, // Stili base per il container
  hoveredStyle = {}, // Stili per stato hovered
  pressedStyle = {}, // Stili per stato pressed
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.baseContainer,
        containerStyle, // Stili personalizzati passati come prop
        hovered && { ...styles.baseHovered, ...hoveredStyle },
        pressed && { ...styles.basePressed, ...pressedStyle },
      ]}
      onPress={onPress}
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
