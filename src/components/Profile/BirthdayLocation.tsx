import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/context/ThemeContext";
import Icon from "@/src/components/Icon";

interface BirthdayLocationProps {
  birthday?: string;
  country?: string;
}

export default function BirthdayLocation({
  birthday,
  country,
}: BirthdayLocationProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // Non renderizzare se entrambi non sono presenti
  if (!birthday && !country) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"]}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          {birthday && (
            <View style={styles.item}>
              <View style={[styles.iconContainer, { backgroundColor: "rgba(168, 100, 255, 0.2)" }]}>
                <Icon name="BirthdayIcon" size={16} color="#A864FF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.label}>BORN</Text>
                <Text style={styles.value}>{birthday}</Text>
              </View>
            </View>
          )}

          {country && (
            <View style={[styles.item, birthday && { marginTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255, 255, 255, 0.1)", paddingTop: 16 }]}>
              <View style={[styles.iconContainer, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                <Icon name="LocationIcon" size={16} color="#10B981" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.label}>LOCATION</Text>
                <Text style={styles.value}>{country}</Text>
              </View>
            </View>
          )}
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
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.text,
      letterSpacing: 0.5,
      opacity: 0.6,
      marginBottom: 4,
    },
    value: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: "500",
    },
  });
