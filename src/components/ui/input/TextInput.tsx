import React, { useContext } from "react";
import { View, TextInput as RNTextInput, StyleSheet } from "react-native";
import AppText from "../../AppText";

import { ThemeContext } from "@/src/context/ThemeContext";

interface TextInputProps {
  value?: string;
  prefix?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLenght?: number;
  numberOfLines?: number;
  onChange?: (text: string) => void;
  onFocus?: () => void;
}

export default function TextInput({
  value,
  prefix,
  placeholder,
  disabled = false,
  maxLenght,
  numberOfLines = 1,
  onChange,
  onFocus,
}: TextInputProps) {
  const isMultiline = numberOfLines > 1;

  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme, disabled, isMultiline);

  return (
    <View style={styles.inputContainer}>
      {prefix && <AppText style={styles.prefix} text={prefix} />}

      <RNTextInput
        style={styles.TextInput}
        value={value ?? ""}
        placeholder={placeholder}
        editable={!disabled}
        onChangeText={onChange}
        onFocus={onFocus}
        maxLength={maxLenght}
        placeholderTextColor={theme.placeholderText}
        multiline={isMultiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );
}

const createStyles = (theme: any, disabled: boolean, isMultiline: boolean) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      borderRadius: isMultiline ? 16 : 99,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      opacity: disabled ? 0.6 : 1,
    },
    TextInput: {
      color: theme.text,
      width: "100%",
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
