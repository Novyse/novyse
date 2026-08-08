import React from "react";
import { StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

type WelcomeButtonTextType = "submit" | "back";

interface WelcomeButtonTextProps {
  type: WelcomeButtonTextType;
  label?: string;
  translationKey?: string;
}

const WelcomeButtonText = ({
  type,
  label,
  translationKey,
}: WelcomeButtonTextProps) => {
  const loginTheme: LoginTheme = "default";
  const styles = createStyles(loginTheme, type);

  return (
    <Typography style={styles.text} text={label} translationKey={translationKey} />
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
