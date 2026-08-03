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

const TRACK_TRAVEL = 20;
const TOGGLE_THRESHOLD = TRACK_TRAVEL / 2;

const Switch: React.FC<SwitchProps> = ({ value, onValueChange }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const isEnabledRef = useRef<boolean>(value);

  const snapToValue = (enabled: boolean) => {
    Animated.spring(animatedValue, {
      toValue: enabled ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  };

  useEffect(() => {
    isEnabledRef.current = value;
    snapToValue(value);
  }, [value, animatedValue]);

  const getTargetValue = (gestureState: PanResponderGestureState) => {
    const isClick = Math.abs(gestureState.dx) < 5;
    if (isClick) {
      return !isEnabledRef.current;
    }

    const startPos = isEnabledRef.current ? TRACK_TRAVEL : 0;
    const finalPos = startPos + gestureState.dx;
    return finalPos > TOGGLE_THRESHOLD;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        _,
        gestureState: PanResponderGestureState,
      ) => Math.abs(gestureState.dx) > 2,

      onPanResponderGrant: () => {
        animatedValue.stopAnimation();
      },

      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const startPos = isEnabledRef.current ? TRACK_TRAVEL : 0;
        const moved = startPos + gestureState.dx;
        const clamped = Math.max(0, Math.min(TRACK_TRAVEL, moved));
        animatedValue.setValue(clamped / TRACK_TRAVEL);
      },

      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const targetValue = getTargetValue(gestureState);
        snapToValue(targetValue);

        if (targetValue !== isEnabledRef.current) {
          onValueChange(targetValue);
        }
      },

      onPanResponderTerminate: () => {
        snapToValue(isEnabledRef.current);
      },
    }),
  ).current;

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.secondary + 75, theme.successText],
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
    width: 45,
    height: 25,
    borderRadius: 20,
    justifyContent: "center",
  },
  thumb: {
    width: 19,
    height: 19,
    borderRadius: 20,
    backgroundColor: theme.text,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
});

export default Switch;
