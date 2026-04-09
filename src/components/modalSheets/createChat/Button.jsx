import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "../../HoverAndPressedButton";

const Button = ({
  id,
  icon,
  title,
  titleKey,
  subtitle,
  subtitleKey,
  selected,
  onSelect,
  theme,
  disabled,
}) => {
  const styles = createStyles(theme);
  return (
    <HoverAndPressedButton
      style={[styles.card, selected === id && styles.cardSelected]}
      onPress={() => onSelect(id)}
      disabled={disabled}
    >
      <View style={styles.cardIconContainer}>
        <Icon name={icon} color={selected === id ? "#FFFFFF" : "#8F90A6"} />
      </View>
      <AppText
        style={[styles.cardTitle, selected === id && styles.textSelected]}
        translationKey={titleKey}
        text={title}
      />
      <AppText
        style={styles.cardSubtitle}
        translationKey={subtitleKey}
        text={subtitle}
      />
    </HoverAndPressedButton>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
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
