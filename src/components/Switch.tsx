import React, { useRef, useEffect, useContext } from "react";
import { ThemeContext } from "@/src/context/ThemeContext";
import {
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderGestureState,
} from "react-native";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ value, onValueChange }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const isEnabledRef = useRef<boolean>(value);

  useEffect(() => {
    isEnabledRef.current = value;
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
  }, [value, animatedValue]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        _,
        gestureState: PanResponderGestureState,
      ) => Math.abs(gestureState.dx) > 2,

      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const startPos = isEnabledRef.current ? 20 : 0;
        const moved = startPos + gestureState.dx;
        const clamped = Math.max(0, Math.min(20, moved));
        animatedValue.setValue(clamped / 20);
      },

      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const isClick = Math.abs(gestureState.dx) < 5;
        if (isClick) {
          onValueChange(!isEnabledRef.current);
        } else {
          const startPos = isEnabledRef.current ? 20 : 0;
          const finalPos = startPos + gestureState.dx;
          onValueChange(finalPos > 10);
        }
      },
    }),
  ).current;

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#4c85ceff", "#30ae5eff"],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.track, { backgroundColor }]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.text,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});

export default Switch;
