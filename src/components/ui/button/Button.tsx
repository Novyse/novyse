import React, { useContext } from "react";
import { StyleSheet, ViewStyle, TextStyle, StyleProp } from "react-native";
import { Theme, ThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/ui/text/AppText";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";

export interface ButtonProps {
  /** Il testo del pulsante (opzionale se si usa translationKey) */
  text?: string;
  /** Chiave di traduzione i18n per il testo (opzionale) */
  translationKey?: string;
  /** Icona a sinistra (opzionale): nome dell'icona (string) o elemento React custom */
  icon?: string | React.ReactNode;
  /** Dimensione dell'icona se 'icon' è una stringa (default 18) */
  iconSize?: number;
  /** Colore dell'icona (default theme.text o personalizzato) */
  iconColor?: string;
  /** Azione al click */
  onPress?: () => void;
  /** Pulsante disabilitato */
  disabled?: boolean;
  /** Stile aggiuntivo per il contenitore del pulsante */
  style?: StyleProp<ViewStyle>;
  /** Stile aggiuntivo per il testo */
  textStyle?: StyleProp<TextStyle>;
  /** Stile aggiuntivo per lo stato hover */
  hoveredStyle?: StyleProp<ViewStyle>;
  /** Stile aggiuntivo per lo stato pressed */
  pressedStyle?: StyleProp<ViewStyle>;
}

export default function Button({
  text,
  translationKey,
  icon,
  iconSize = 20,
  iconColor,
  onPress,
  disabled = false,
  style,
  textStyle,
  hoveredStyle,
  pressedStyle,
}: ButtonProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === "string") {
      return (
        <Icon name={icon} size={iconSize} color={iconColor || theme.text} />
      );
    }

    return icon;
  };

  return (
    <HoverAndPressedButton
      style={[styles.createBtn, style]}
      hoveredStyle={[styles.hovered, hoveredStyle]}
      pressedStyle={[styles.pressed, pressedStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      {renderIcon()}
      <AppText
        text={text}
        translationKey={translationKey}
        style={[
          styles.createBtnText,
          icon ? styles.createBtnTextWithIcon : undefined,
          textStyle,
        ]}
      />
    </HoverAndPressedButton>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    createBtn: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 100,
    },
    createBtnText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
    },
    createBtnTextWithIcon: {
      marginLeft: 5,
    },
    hovered: {
      backgroundColor: theme.primary,
      opacity: 0.9,
    },
    pressed: {
      backgroundColor: theme.primary,
      opacity: 0.8,
    },
  });
