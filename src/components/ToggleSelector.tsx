import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

export interface ToggleOption<T extends string = string> {
  value: T;
  label: string;
}

interface ToggleSelectorProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

function ToggleSelector<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
}: ToggleSelectorProps<T>) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.toggleContainer}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[styles.toggleText, isActive && styles.toggleTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    toggleContainer: {
      flexDirection: "row",
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      borderRadius: 50,
      padding: 5,
      marginBottom: 25,
      width: "100%",
      maxWidth: 300,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 25,
    },
    toggleButtonActive: {
      backgroundColor: theme.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.subtitle2,
    },
    toggleTextActive: {
      color: "#fff",
    },
  });
}

export default ToggleSelector;
