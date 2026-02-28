import React from "react";
import { View, Text, StyleSheet } from "react-native";
import HoverAndPressedButton from "../../HoverAndPressedButton";
import Icon from "@/src/components/Icon";

const Button = ({ id, icon, title, subtitle, selected, onSelect, theme, disabled }) => {
  const styles = createStyles(theme);
  return (
    <HoverAndPressedButton
      style={[styles.card, selected === id && styles.cardSelected]}
      onPress={() => onSelect(id)}
      disabled={disabled}
    >
      <View style={styles.cardIconContainer}>
        <Icon
          name={icon}
          size={24}
          color={selected === id ? "#FFFFFF" : "#8F90A6"}
        />
      </View>
      <Text style={[styles.cardTitle, selected === id && styles.textSelected]}>
        {title}
      </Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </HoverAndPressedButton>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    // Cards Styles
    card: {
      flex: 1,
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    cardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    cardIconContainer: {
      marginBottom: 10,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 10,
      color: theme.placeholderText,
      textAlign: "center",
      lineHeight: 14,
    },
    textSelected: {
      color: theme.text,
    },
  });

export default Button;
