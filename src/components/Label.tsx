import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

import { ThemeContext } from "@/context/ThemeContext";

interface LabelProps {
  text?: string;
  translationKey?: string;
}

export default function Label({ text, translationKey }: LabelProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return translationKey ? (
    <AppText style={styles.label} translationKey={translationKey} />
  ) : text ? (
    <AppText style={styles.label} text={text} />
  ) : null;
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
