import React, { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import AppText from "../AppText";
import { useTranslation } from "react-i18next";
import DatePicker from "react-native-date-picker";
import { DateTime } from "luxon";

import { ThemeContext } from "@/context/ThemeContext";

interface DateInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (date: string) => void;
}

export default function DateInput({
  value,
  placeholder,
  disabled = false,
  onChange,
}: DateInputProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext) as { theme: any };
  const styles = createStyles(theme, disabled);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(value ? new Date(value) : new Date());

  const onDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
  };

  const confirmDate = () => {
    const formattedDate = DateTime.fromJSDate(date).toFormat("dd/MM/yyyy");
    onChange?.(formattedDate);
    setOpen(false);
  };

  const showDatepicker = () => {
    setOpen(true);
  };

  const displayValue = value || t(placeholder || "common.inputs.select_date");

  return (
    <View style={styles.inputContainer}>
      <Pressable
        onPress={showDatepicker}
        style={styles.pressable}
        disabled={disabled}
      >
        <AppText
          style={[styles.text, !value && styles.placeholder]}
          text={displayValue}
        />
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {Platform.select({
              web: (
                <input
                  type="date"
                  value={DateTime.fromJSDate(date).toISODate() || ""}
                  onChange={(e) => setDate(new Date(e.target.value))}
                  style={{
                    color: theme.text,
                    backgroundColor: theme.backgroundCard,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    padding: 10,
                    borderRadius: 5,
                  }}
                />
              ),
              default: (
                <DatePicker
                  date={date}
                  onDateChange={onDateChange}
                  mode="date"
                  maximumDate={new Date()}
                />
              ),
            })}
            <Pressable onPress={confirmDate} style={styles.confirmButton}>
              <AppText
                style={styles.confirmText}
                translationKey="common.inputs.confirm"
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any, disabled: boolean) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 99,
      backgroundColor: theme.backgroundCard,
      opacity: disabled ? 0.6 : 1,
    },
    pressable: {
      flex: 1,
    },
    text: {
      color: theme.text,
      fontSize: 14,
    },
    placeholder: {
      color: theme.placeholderText,
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.backgroundCard,
      borderRadius: 10,
      padding: 20,
      alignItems: "center",
    },
    confirmButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.primary,
      borderRadius: 5,
    },
    confirmText: {
      color: theme.text,
      fontSize: 16,
    },
  });
