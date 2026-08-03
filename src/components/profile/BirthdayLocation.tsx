import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

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
        colors={theme.backgroundMainGradient}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          {birthday && (
            <View style={styles.item}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Icon name="BirthdayIcon" size={16} />
              </View>
              <View style={styles.textContainer}>
                <AppText
                  style={styles.label}
                  translationKey="profile.birthdayLocation.born"
                />
                <AppText style={styles.value} text={birthday} />
              </View>
            </View>
          )}

          {country && (
            <View
              style={[
                styles.item,
                birthday && {
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: theme.borderColor,
                  paddingTop: 16,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Icon name="LocationIcon" size={16} />
              </View>
              <View style={styles.textContainer}>
                <AppText
                  style={styles.label}
                  translationKey="profile.birthdayLocation.location"
                />
                <AppText style={styles.value} text={country} />
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
      borderColor: theme.borderColor,
      backgroundColor: theme.backgroundMain,
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
      color: theme.text,
      fontWeight: "500",
    },
  });
