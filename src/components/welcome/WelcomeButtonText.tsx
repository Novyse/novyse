import React from "react";
import { StyleSheet, Text } from "react-native";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

type WelcomeButtonTextType = "submit" | "back";

interface WelcomeButtonTextProps {
  type: WelcomeButtonTextType;
  label: string;
}

const WelcomeButtonText = ({ type, label }: WelcomeButtonTextProps) => {
  const loginTheme: LoginTheme = "default";
  const styles = createStyles(loginTheme, type);

  return (
    <Text style={styles.text} selectable={false}>
      {label}
    </Text>
  );
};

function createStyles(loginTheme: LoginTheme, type: WelcomeButtonTextType) {
  return StyleSheet.create({
    text: {
      fontSize: 16,
      color:
        type === "submit"
          ? LoginColors[loginTheme].submitButtonTextColor
          : LoginColors[loginTheme].backButtonTextColor,
    },
  });
}

export default WelcomeButtonText;
