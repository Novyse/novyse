import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
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

  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);

  const itemWidth = containerWidth / options.length;
  const activeIndex = options.findIndex((opt) => opt.value === value);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withSpring(activeIndex * itemWidth, {
        damping: 55,
        stiffness: 420,
      });
    }
  }, [activeIndex, itemWidth]);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width - 10);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: itemWidth,
  }));

  return (
    <View style={styles.toggleContainer} onLayout={onLayout}>
      {containerWidth > 0 && (
        <Animated.View style={[styles.animatedBackground, animatedStyle]} />
      )}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={styles.toggleButton}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            activeOpacity={0.7}
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
      position: "relative",
    },
    animatedBackground: {
      position: "absolute",
      top: 5,
      left: 5,
      bottom: 5,
      backgroundColor: theme.primary,
      borderRadius: 25,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 25,
      zIndex: 1,
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
