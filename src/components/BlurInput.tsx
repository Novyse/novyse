import React, { useContext } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

interface BlurInputProps {
  value?: string;
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLenght?: number;
  onChange?: (text: string) => void;
}

export default function BlurInput({
  value,
  prefix,
  placeholder,
  disabled,
  maxLenght,
  onChange,
}: BlurInputProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.inputContainer}>
      {prefix && <Text style={styles.prefix}>{prefix}</Text>}

      <TextInput
        style={styles.blurInput}
        value={value}
        placeholder={placeholder}
        editable={!disabled}
        onChangeText={onChange}
        maxLength={maxLenght}
        placeholderTextColor={theme.placeholderText}
      />
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      borderRadius: 99,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
    },

    blurInput: {
      color: theme.text,
      fontSize: 14,
      outlineStyle: "solid",
      outlineWidth: 0,
    },
    prefix: {
      fontSize: 14,
      color: theme.placeholderText,
      marginRight: 8,
    },
  });
