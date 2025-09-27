import React from "react";
import { StyleSheet, Text } from "react-native";
import { LoginColors } from "@/constants/LoginColors";

const WelcomeButtonText = ({ type }) => {
  const loginTheme = "default";
  const styles = createStyles(loginTheme, type);

  return (
    <Text style={styles.text} selectable={false}>
      {type === "submit" ? "Continue" : "Back"}
    </Text>
  );
};

function createStyles(loginTheme, type) {
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
