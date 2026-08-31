import React, { useContext, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { FlashList } from "@shopify/flash-list";
import Typography from "@/src/components/ui/typography/Typography";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/src/context/ThemeContext";
import { ScrollBar } from "@/constants/ScrollBar";

interface SelectInputProps {
  options: string[];
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  isSmallScreen?: boolean;
}

export default function SelectInput({
  options,
  value,
  placeholder = "Select an option",
  onChange,
  disabled = false,
  isSmallScreen = false,
}: SelectInputProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext) as { theme: any };
  const styles = createStyles(theme);

  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setModalVisible(false);
  };

  const hasOptions = options.length > 0;
  const displayText = hasOptions
    ? value || t(placeholder || "common.inputs.select_placeholder")
    : t("common.inputs.no_options");

  if (!isSmallScreen) {
    return (
      <View style={styles.inputContainer}>
        <select
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          style={{
            width: "100%",
            borderRadius: 99,
            backgroundColor: theme.backgroundCard,
            color: theme.text,
            border: "none",
            outline: "none",
            fontSize: 14,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <option value="" disabled>
            {t(placeholder || "common.inputs.select_placeholder")}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.inputContainer, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Typography
          style={[styles.text, !value && styles.subtitle]}
          numberOfLines={1}
          text={displayText}
        />
        <Typography style={styles.arrow} text="▼" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlashList
              data={options}
              keyExtractor={(item) => item}
              style={styles.optionsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item === value && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Typography
                    style={[
                      styles.optionText,
                      item === value && styles.selectedOptionText,
                    ]}
                    text={item}
                  />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 99,
      backgroundColor: theme.backgroundCard,
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      color: theme.text,
      fontSize: 14,
      flex: 1,
    },
    subtitle: {
      color: theme.subtitle,
    },
    arrow: {
      color: theme.subtitle,
      fontSize: 12,
      marginLeft: 2,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.backgroundCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "50%",
      minHeight: 200,
    },
    optionsList: {
      width: "100%",
      ...ScrollBar(theme),
    },
    option: {
      width: "100%",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    selectedOption: {
      backgroundColor: theme.primary,
    },
    optionText: {
      color: theme.text,
      fontSize: 16,
    },
    selectedOptionText: {
      color: theme.primary,
      fontWeight: "bold",
    },
    separator: {
      height: 1,
      backgroundColor: theme.subtitle,
    },
  });
