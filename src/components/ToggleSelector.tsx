import React, { useContext, useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  ScrollView,
  Platform,
} from "react-native";
import { useRef } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemeContext } from "@/src/context/ThemeContext";

import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";

export interface ToggleOption<T extends string = string> {
  value: T;
  label?: string;
  icon?: string;
}

interface ToggleSelectorProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: any;
  buttonWidth?: number;
}

function ToggleSelector<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  style,
  buttonWidth,
}: ToggleSelectorProps<T>) {
  const { theme } = useContext(ThemeContext);
  const hasIcons = options.some((opt) => opt.icon);
  const styles = createStyles(theme, hasIcons, buttonWidth);

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

      scrollViewRef.current?.scrollTo({
        x: activeIndex * itemWidth - 20,
        animated: true,
      });
    }
  }, [activeIndex, itemWidth, containerWidth]);

  const scrollRefCallback = (node: any) => {
    if (Platform.OS === "web" && node) {
      const el = node.getScrollableNode?.() || node;
      if (el && typeof el.addEventListener === "function") {
        const onWheel = (e: WheelEvent) => {
          if (e.deltaY !== 0) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
          }
        };
        let isDown = false;
        let startX: number;
        let scrollLeft: number;

        const onMouseDown = (e: MouseEvent) => {
          isDown = true;
          startX = e.pageX - el.offsetLeft;
          scrollLeft = el.scrollLeft;
        };

        const onMouseLeave = () => {
          isDown = false;
        };

        const onMouseUp = () => {
          isDown = false;
        };

        const onMouseMove = (e: MouseEvent) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - el.offsetLeft;
          const walk = (x - startX) * 1.5;
          el.scrollLeft = scrollLeft - walk;
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("mousedown", onMouseDown);
        el.addEventListener("mouseleave", onMouseLeave);
        el.addEventListener("mouseup", onMouseUp);
        el.addEventListener("mousemove", onMouseMove);

        node._cleanup = () => {
          el.removeEventListener("wheel", onWheel);
          el.removeEventListener("mousedown", onMouseDown);
          el.removeEventListener("mouseleave", onMouseLeave);
          el.removeEventListener("mouseup", onMouseUp);
          el.removeEventListener("mousemove", onMouseMove);
        };
      }
    } else if (Platform.OS === "web" && !node) {
      if (scrollViewRef.current && (scrollViewRef.current as any)._cleanup) {
        (scrollViewRef.current as any)._cleanup();
      }
    }
    (scrollViewRef as any).current = node;
  };

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width - 10);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: itemWidth,
  }));

  return (
    <ScrollView
      ref={scrollRefCallback}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={[styles.scrollView, style]}
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
              {option.icon ? (
                <Icon
                  name={option.icon}
                  size={18}
                  color={isActive ? theme.text : theme.subtitle}
                />
              ) : (
                <AppText
                  style={[
                    styles.toggleText,
                    isActive && styles.toggleTextActive,
                  ]}
                  text={option.label || ""}
                  numberOfLines={1}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(theme: any, hasIcons?: boolean, buttonWidth?: number) {
  return StyleSheet.create({
    scrollView: {
      flexGrow: 0,
      marginBottom: 25,
      borderRadius: 50,
    },
    scrollContent: {
      flexGrow: 1,
      borderRadius: 50,
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
      paddingHorizontal: 12,
      minWidth: buttonWidth !== undefined ? buttonWidth : hasIcons ? 46 : 110,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 25,
      zIndex: 1,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.subtitle,
      textAlign: "center",
    },
    toggleTextActive: {
      color: theme.text,
    },
  });
}

export default ToggleSelector;
