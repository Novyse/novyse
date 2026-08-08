import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";

import { ThemeContext } from "@/src/context/ThemeContext";

import Icon from "@/src/components/ui/icon/Icon";

interface SectionHeaderProps {
  title?: string;
  translationKey?: string;
  icon: string;
}

export default function SectionHeader({
  title,
  translationKey,
  icon,
}: SectionHeaderProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} />
      {translationKey ? (
        <Typography style={styles.sectionTitle} translationKey={translationKey} />
      ) : title ? (
        <Typography style={styles.sectionTitle} text={title} />
      ) : null}
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
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 10,
    },
  });
