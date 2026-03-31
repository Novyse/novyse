import React, { useContext } from "react";
import { Text, StyleSheet } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

interface LabelProps {
  text: string;
}

export default function Label({ text }: LabelProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return <Text style={styles.label}>{text}</Text>;
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    label: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
  });
