import React, { useContext } from "react";
import { View, TextInput as RNTextInput, StyleSheet } from "react-native";
import AppText from "../text/AppText";
import Label from "../label/Label";

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
  label?: string;
  labelTranslationKey?: string;
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
  label,
  labelTranslationKey,
}: TextInputProps) {
  const isMultiline = numberOfLines > 1;

  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme, disabled, prefix, suffix);

  const inputElement = (
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

  if (label || labelTranslationKey) {
    return (
      <View style={styles.container}>
        <Label text={label} translationKey={labelTranslationKey} />
        {inputElement}
      </View>
    );
  }

  return inputElement;
}

const createStyles = (theme: any, disabled: boolean, prefix: any, suffix: any) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    inputContainer: {
      flexDirection: "row",
      borderRadius: 25,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      opacity: disabled ? 0.6 : 1,
      paddingLeft: prefix ? 20 : 0,
      paddingRight: suffix ? 20 : 0,
    },
    TextInput: {
      color: theme.text,
      flex: 1,
      fontSize: 15,
      outlineStyle: "solid",
      outlineWidth: 0,
      paddingVertical: 15,
      paddingLeft: prefix ? 0 : 20,
      paddingRight: suffix ? 0 : 20,
    },
    prefix: {
      fontSize: 15,
      color: theme.placeholderText,
      marginRight: 15,
    },
    suffix: {
      marginLeft: 15,
    },
  });
