import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/context/ThemeContext";

interface AboutMeProps {
  description?: string;
}

export default function AboutMe({ description }: AboutMeProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // Se description non è presente, mostra il messaggio di default
  const displayText = description || "We don't know anything about him :(";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"]}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          <Text style={styles.title}>ABOUT ME</Text>
          <Text style={styles.description}>{displayText}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    glassCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
      backgroundColor: "rgba(30, 41, 59, 0.4)",
      overflow: "hidden",
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.text,
      letterSpacing: 1,
      marginBottom: 12,
      opacity: 0.7,
    },
    description: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: 20,
    },
  });
