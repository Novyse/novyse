import React, { useContext } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

interface SettingsCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ! Will be deprecated with the new settings

const SettingsCard = ({ children, style }: SettingsCardProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return <View style={[styles.card, style]}>{children}</View>;
};

function createStyle(theme: any) {
  return StyleSheet.create({
    card: {
      padding: 25,
      width: "100%",
      borderRadius: 25,
      overflow: "hidden",
      backgroundColor: theme.backgroundMain,
    },
  });
}

export default SettingsCard;
