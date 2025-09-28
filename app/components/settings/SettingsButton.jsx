import React, { Children, useContext } from "react";
import { StyleSheet, Text } from "react-native";
import { ThemeContext } from "../../../context/ThemeContext";
import HoverAndPressedButton from "../HoverAndPressedButton";

const SettingsButton = ({
  onPress,
  text,
  textStyle,
  disabled = false,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <HoverAndPressedButton
      style={styles.button}
      hoveredStyle={styles.buttonHovered}
      pressedStyle={styles.buttonPressed}
      onPress={onPress}
      disabled={disabled}
    >
      {text && <Text style={[styles.buttonText, textStyle]}>{text}</Text>}
      
    </HoverAndPressedButton>
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
      backgroundColor: theme.backgroundSettingsButton,
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
