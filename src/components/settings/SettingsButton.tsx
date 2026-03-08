import React, { useContext } from "react";
import {
  StyleSheet,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Theme, ThemeContext } from "@/context/ThemeContext";
import HoverAndPressedButton from "../HoverAndPressedButton";

interface SettingsButtonProps {
  onPress: () => void | Promise<void>;
  text?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

const SettingsButton = ({
  onPress,
  text,
  style,
  textStyle,
  disabled = false,
}: SettingsButtonProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <HoverAndPressedButton
      style={[styles.button, style] as any}
      hoveredStyle={styles.buttonHovered}
      pressedStyle={styles.buttonPressed}
      onPress={onPress}
      disabled={disabled}
    >
      {text && <Text style={[styles.buttonText, textStyle]}>{text}</Text>}
    </HoverAndPressedButton>
  );
};

const createStyle = (theme: Theme) =>
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
      cursor: "pointer" as any,
    },
    buttonPressed: {
      backgroundColor: theme.settingsPressedButton,
    },
    buttonDisabled: {
      backgroundColor: (theme as any).disabledBackground,
      opacity: 0.5,
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default SettingsButton;
