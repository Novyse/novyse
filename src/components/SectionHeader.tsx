import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import Icon from "@/src/components/Icon";

interface SectionHeaderProps {
  title: string;
  icon?: string;
}

export default function SectionHeader({ title, icon }: SectionHeaderProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.sectionHeader}>
      <Icon
        name={icon}
        size={20}
        color={theme.icon}
        style={{ marginRight: 8 }}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
  });
