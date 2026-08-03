import React, { useContext } from "react";
import { View, TextInput as RNTextInput, StyleSheet } from "react-native";
import AppText from "../text/AppText";

import { ThemeContext } from "@/src/context/ThemeContext";

interface TextInputProps {
  value?: string;
  prefix?: string;
  suffix?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  maxLenght?: number;
  numberOfLines?: number;
  onChange?: (text: string) => void;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
}

export default function TextInput({
  value,
  prefix,
  suffix,
  placeholder,
  disabled = false,
  maxLenght,
  numberOfLines = 1,
  onChange,
  onChangeText,
  onFocus,
  autoCapitalize,
  secureTextEntry,
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
        onChangeText={onChangeText || onChange}
        onFocus={onFocus}
        maxLength={maxLenght}
        placeholderTextColor={theme.placeholderText}
        multiline={isMultiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
      />

      {suffix && <View style={styles.suffix}>{suffix}</View>}
    </View>
  );
}

const createStyles = (theme: any, disabled: boolean) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      flexDirection: "row",
      borderRadius: 25,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      opacity: disabled ? 0.6 : 1,
    },
    TextInput: {
      color: theme.text,
      flex: 1,
      fontSize: 15,
      outlineStyle: "solid",
      outlineWidth: 0,
    },
    prefix: {
      fontSize: 15,
      color: theme.placeholderText,
      marginRight: 8,
    },
    suffix: {
      marginLeft: 8,
    },
  });
