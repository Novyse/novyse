import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from "react-native";

const DropdownMenu = ({
  label,
  value,
  options,
  onValueChange,
  theme,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const maxHeight = Math.min(options.length * 50, 200); // Max height for dropdown

  const toggleDropdown = () => {
    if (disabled) return;

    const toValue = isOpen ? 0 : maxHeight;
    setIsOpen(!isOpen);
    Animated.timing(dropdownHeight, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    toggleDropdown();
  };

  const getDisplayText = () => {
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.dropdownHeader,
          disabled && styles.dropdownDisabled,
          isOpen && styles.dropdownHeaderOpen,
        ]}
        onPress={toggleDropdown}
        disabled={disabled}
      >
        <Text style={[styles.dropdownText, disabled && styles.disabledText]}>
          {getDisplayText()}
        </Text>
        <Text
          style={[
            styles.arrow,
            disabled && styles.disabledText,
            isOpen && styles.arrowUp,
          ]}
        >
          ▼
        </Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.dropdownListContainer,
          {
            height: dropdownHeight,
            opacity: dropdownHeight.interpolate({
              inputRange: [0, maxHeight],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <ScrollView
          style={styles.dropdownList}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {options.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.option,
                item.value === value && styles.selectedOption,
              ]}
              onPress={() => handleSelect(item.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  item.value === value && styles.selectedOptionText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 10,
      zIndex: 1,
    },
    label: {
      color: theme.text,
      fontSize: 16,
      marginBottom: 8,
      fontWeight: "500",
    },
    dropdownHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 10,
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border || "#ddd",
      backgroundColor: theme.cardBackground || "#fff",
    },
    dropdownHeaderOpen: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
    },
    dropdownDisabled: {
      opacity: 0.5,
    },
    dropdownText: {
      color: theme.text,
      fontSize: 16,
      flex: 1,
    },
    disabledText: {
      color: theme.textSecondary || "#999",
    },
    arrow: {
      color: theme.text,
      fontSize: 12,
      transform: [{ rotate: "0deg" }],
    },
    arrowUp: {
      transform: [{ rotate: "180deg" }],
    },
    dropdownListContainer: {
      overflow: "hidden",
      backgroundColor: theme.cardBackground || "#fff",
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.border || "#ddd",
    },
    dropdownList: {
      width: "100%",
    },
    option: {
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: theme.border || "#eee",
    },
    selectedOption: {
      backgroundColor: `${theme.primary}20` || "#007AFF20",
    },
    optionText: {
      color: theme.text,
      fontSize: 16,
    },
    selectedOptionText: {
      color: theme.primary || "#007AFF",
      fontWeight: "600",
    },
  });

export default DropdownMenu;
