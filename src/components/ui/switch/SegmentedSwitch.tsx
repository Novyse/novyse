import React, { useContext, useEffect, useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  ScrollView,
  Platform,
  View,
} from "react-native";
import { useRef } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemeContext } from "@/src/context/ThemeContext";

import BlurredView from "@/src/components/layout/BlurredView";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import Label from "../label/Label";

export interface ToggleOption<T extends string = string> {
  value: T;
  label?: string;
  icon?: string;
  disabled?: boolean;
}

interface SegmentedSwitchProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: any;
  buttonWidth?: number;
  label?: string;
  labelTranslationKey?: string;
}

function SegmentedSwitch<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  style,
  buttonWidth,
  label,
  labelTranslationKey,
}: SegmentedSwitchProps<T>) {
  const { theme } = useContext(ThemeContext);

  // for reference see createChatModal implementation
  const isIconOnly = options.every((opt) => opt.icon && !opt.label);
  const styles = createStyles(theme, isIconOnly, buttonWidth);

  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const itemWidth = containerWidth / options.length;
  const activeIndex = options.findIndex((opt) => opt.value === value);

  useEffect(() => {
    if (containerWidth > 0) {
      translateX.value = withSpring(activeIndex * itemWidth, {
        damping: 95,
        stiffness: 700,
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

  const switchElement = (
    <ScrollView
      ref={scrollRefCallback}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={[styles.scrollView, style]}
    >
      <BlurredView style={styles.toggleContainer} onLayout={onLayout}>
        {containerWidth > 0 && (
          <Animated.View style={[styles.animatedBackground, animatedStyle]} />
        )}
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.toggleButton,
                option.disabled && styles.toggleButtonDisabled,
              ]}
              onPress={() =>
                !disabled && !option.disabled && onChange(option.value)
              }
              disabled={disabled || option.disabled}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{
                selected: isActive,
                disabled: option.disabled,
              }}
            >
              {option.icon && (
                <Icon
                  name={option.icon}
                  size={18}
                  color={
                    isActive
                      ? theme.text
                      : option.disabled
                        ? theme.placeholderText
                        : theme.subtitle
                  }
                />
              )}
              {option.label && (
                <Typography
                  style={[
                    styles.toggleText,
                    isActive && styles.toggleTextActive,
                    option.disabled && styles.toggleTextDisabled,
                  ]}
                  text={option.label}
                  numberOfLines={1}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </BlurredView>
    </ScrollView>
  );

  if (label || labelTranslationKey) {
    return (
      <View style={styles.container}>
        <Label text={label} translationKey={labelTranslationKey} />
        {switchElement}
      </View>
    );
  }

  return switchElement;
}

function createStyles(theme: any, isIconOnly?: boolean, buttonWidth?: number) {
  return StyleSheet.create({
    container: {
      width: "100%",
    },
    scrollView: {
      flexGrow: 0,
      borderRadius: 50,
    },
    scrollContent: {
      flexGrow: 1,
      borderRadius: 50,
    },
    toggleContainer: {
      flexDirection: "row",
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
    },
    toggleButton: {
      flex: 1,
      flexDirection: "row",
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 15,
      minWidth: buttonWidth !== undefined ? buttonWidth : isIconOnly ? 45 : 110,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 25,
      zIndex: 1,
    },
    toggleButtonDisabled: {
      opacity: 0.5,
    },
    toggleText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.subtitle,
      textAlign: "center",
    },
    toggleTextActive: {
      color: theme.text,
    },
    toggleTextDisabled: {
      color: theme.placeholderText,
    },
  });
}

export default SegmentedSwitch;
