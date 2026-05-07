import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import AppText from "./AppText";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownMenuProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onValueChange: (value: string) => void;
  theme: any;
  disabled?: boolean;
}

const DropdownMenu = ({
  label,
  value,
  options,
  onValueChange,
  theme,
  disabled = false,
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownHeight = useRef(new Animated.Value(0)).current;
  const maxHeight = Math.min(options.length * 50, 200);

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

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    toggleDropdown();
  };

  const getDisplayText = (): string => {
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <AppText style={styles.label} text={label} />

      <TouchableOpacity
        style={[
          styles.dropdownHeader,
          disabled && styles.dropdownDisabled,
          isOpen && styles.dropdownHeaderOpen,
        ]}
        onPress={toggleDropdown}
        disabled={disabled}
      >
        <AppText
          style={[styles.dropdownText, disabled && styles.disabledText]}
          text={getDisplayText()}
        />
        <AppText
          style={[
            styles.arrow,
            disabled && styles.disabledText,
            isOpen && styles.arrowUp,
          ]}
          text="▼"
        />
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
              <AppText
                style={[
                  styles.optionText,
                  item.value === value && styles.selectedOptionText,
                ]}
                text={item.label}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: any) =>
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
      backgroundColor: theme.backgroundTextField,
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
      color: theme.subtitle,
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
      backgroundColor: theme.backgroundTextField,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      borderTopWidth: 0,
    },
    dropdownList: {
      width: "100%",
      ...(Platform.OS === "web" && {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    option: {
      padding: 15,
    },
    selectedOption: {
      backgroundColor: theme.backgroundMainGradient[0],
    },
    optionText: {
      color: theme.text,
      fontSize: 16,
    },
    selectedOptionText: {
      color: theme.primary,
      fontWeight: "600",
    },
  });

export default DropdownMenu;
