import React, { useContext } from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import { ThemeContext } from "../../../context/ThemeContext";

const SettingsButton = ({
  onPress,
  text,
  style,
  textStyle,
  disabled = false,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <Pressable
      style={({ pressed, hovered }) => [
        styles.button,
        style,
        hovered && styles.buttonHovered,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: theme.rippleColor }}
    >
      {text && <Text style={[styles.buttonText, textStyle]}>{text}</Text>}
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    button: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: "center",
      backgroundColor: theme.settingsButton,
      transition: "background-color 0.2s ease",
    },
    buttonHovered: {
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer",
    },
    buttonPressed: {
      backgroundColor: theme.settingsPressedButton,
    },
    buttonDisabled: {
      backgroundColor: theme.disabledBackground,
      opacity: 0.5,
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default SettingsButton;
