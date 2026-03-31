import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  TextInput,
} from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

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
  const { theme } = useContext(ThemeContext) as { theme: any };
  const styles = createStyles(theme);

  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setModalVisible(false);
  };

  const hasOptions = options.length > 0;
  const displayText = hasOptions ? value || placeholder : "No options";

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
            {placeholder}
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
        <Text
          style={[styles.text, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item === value && styles.selectedOption,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item === value && styles.selectedOptionText,
                    ]}
                  >
                    {item}
                  </Text>
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
    placeholder: {
      color: theme.placeholderText,
    },
    arrow: {
      color: theme.placeholderText,
      fontSize: 12,
      marginLeft: 2,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      backgroundColor: theme.backgroundCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "50%",
      minHeight: 200,
    },
    option: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    selectedOption: {
      backgroundColor: theme.primary + "20", // 20% opacity
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
      backgroundColor: theme.placeholderText + "30",
    },
  });
