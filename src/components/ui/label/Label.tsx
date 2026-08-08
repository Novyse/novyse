import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { ThemeContext } from "@/src/context/ThemeContext";

interface LabelProps {
  // text to print generale text (doesn't change with languages)
  text?: string;
  // translationKey to print text that change with languages
  translationKey?: string;
  translationOptions?: Record<string, unknown>;
}

export default function Label({
  text,
  translationKey,
  translationOptions,
}: LabelProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return translationKey ? (
    <Typography
      weight="semibold"
      size="sm"
      style={styles.label}
      translationKey={translationKey}
      translationOptions={translationOptions}
    />
  ) : text ? (
    <Typography style={styles.label} text={text} />
  ) : null;
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    label: {
      marginBottom: 10,
    },
  });
