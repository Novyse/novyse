import React, { useContext } from "react";
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Theme, ThemeContext } from "@/src/context/ThemeContext";
import HoverAndPressedButton from "../HoverAndPressedButton";
import AppText from "@/src/components/ui/text/AppText";

interface SettingsButtonProps {
  onPress: () => void | Promise<void>;
  text?: string;
  translationKey?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

const SettingsButton = ({
  onPress,
  text,
  translationKey,
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
      {translationKey ? (
        <AppText
          style={[styles.buttonText, textStyle]}
          translationKey={translationKey}
        />
      ) : text ? (
        <AppText style={[styles.buttonText, textStyle]} text={text} />
      ) : null}
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
      backgroundColor: theme.primary,
    },
    buttonHovered: {
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer" as any,
    },
    buttonPressed: {
      backgroundColor: theme.settingsPressedButton,
    },

    buttonText: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default SettingsButton;
