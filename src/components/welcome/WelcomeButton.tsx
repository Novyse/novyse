import React from "react";
import { StyleSheet } from "react-native";
import HoverAndPressedButton from "../HoverAndPressedButton";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

type WelcomeButtonType = "submit" | "back";

interface WelcomeButtonProps {
  children: React.ReactNode;
  type: WelcomeButtonType;
  onPress: () => void;
  disabled?: boolean;
}

const WelcomeButton = ({
  children,
  type,
  onPress,
  disabled,
}: WelcomeButtonProps) => {
  const loginTheme: LoginTheme = "default";
  const styles = createStyles(loginTheme);

  const hoverColor =
    type === "submit"
      ? LoginColors[loginTheme].hoveredSubmitButton
      : LoginColors[loginTheme].hoveredBackButton;

  const pressColor =
    type === "submit"
      ? LoginColors[loginTheme].pressedSubmitButton
      : LoginColors[loginTheme].pressedBackButton;

  return (
    <HoverAndPressedButton
      style={type === "submit" ? styles.submitButton : styles.backButton}
      hoveredStyle={{ backgroundColor: hoverColor }}
      pressedStyle={{ backgroundColor: pressColor }}
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </HoverAndPressedButton>
  );
};

function createStyles(loginTheme: LoginTheme) {
  return StyleSheet.create({
    submitButton: {
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      maxWidth: 300,
      width: "100%",
      flex: 1,
      height: 45,
    },
    backButton: {
      backgroundColor: LoginColors[loginTheme].backgroundBackButton,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      maxWidth: 300,
      width: "100%",
      flex: 1,
      height: 45,
      marginRight: 16,
    },
  });
}

export default WelcomeButton;
