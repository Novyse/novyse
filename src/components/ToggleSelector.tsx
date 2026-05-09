import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  ScrollView,
} from "react-native";
import { useRef } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemeContext } from "@/context/ThemeContext";
import AppText from "./AppText";

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
  const scrollViewRef = useRef<ScrollView>(null);

  const itemWidth = containerWidth / options.length;
  const activeIndex = options.findIndex((opt) => opt.value === value);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withSpring(activeIndex * itemWidth, {
        damping: 70,
        stiffness: 500,
      });

      // Auto-scroll to active item
      scrollViewRef.current?.scrollTo({
        x: activeIndex * itemWidth - 20, // Center a bit
        animated: true,
      });
    }
  }, [activeIndex, itemWidth, containerWidth]);


  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width - 10);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: itemWidth,
  }));

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
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
              <AppText
                style={[styles.toggleText, isActive && styles.toggleTextActive]}
                text={option.label}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    scrollView: {
      flexGrow: 0,
      marginBottom: 25,
    },
    scrollContent: {
      flexGrow: 1,
    },
    toggleContainer: {
      flexDirection: "row",
      backgroundColor: theme.iconPressed,
      borderRadius: 50,
      padding: 5,
      minWidth: "100%",
      alignSelf: "flex-start",
      position: "relative",
    },
    animatedBackground: {
      position: "absolute",
      top: 5,
      left: 5,
      bottom: 5,
      backgroundColor: theme.primary,
      borderRadius: 25,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 20,
      minWidth: 80,
      alignItems: "center",
      borderRadius: 25,
      zIndex: 1,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.subtitle,
    },
    toggleTextActive: {
      color: theme.text,
    },
  });
}

export default ToggleSelector;
