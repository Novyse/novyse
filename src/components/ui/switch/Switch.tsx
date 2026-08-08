import React, { useRef, useEffect, useContext, useCallback } from "react";
import { ThemeContext } from "@/src/context/ThemeContext";
import {
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderGestureState,
  Easing,
} from "react-native";

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const TRACK_TRAVEL = 20;
const TOGGLE_THRESHOLD = TRACK_TRAVEL / 2;
const THUMB_SCALE_PRESSED = 0.88;
const THUMB_SCALE_TOGGLE = 0.72;

const Switch: React.FC<SwitchProps> = ({ value, onValueChange }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const isEnabledRef = useRef<boolean>(value);

  const animateToValue = useCallback(
    (enabled: boolean, { pulse = true }: { pulse?: boolean } = {}) => {
      animatedValue.stopAnimation();
      thumbScale.stopAnimation();

      const positionAnimation = Animated.spring(animatedValue, {
        toValue: enabled ? 1 : 0,
        useNativeDriver: false,
        friction: 8,
        tension: 100,
      });

      if (!pulse) {
        Animated.parallel([
          positionAnimation,
          Animated.spring(thumbScale, {
            toValue: 1,
            useNativeDriver: false,
            friction: 7,
            tension: 140,
          }),
        ]).start();
        return;
      }

      Animated.parallel([
        Animated.timing(thumbScale, {
          toValue: THUMB_SCALE_TOGGLE,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.spring(animatedValue, {
          toValue: enabled ? 1 : 0,
          useNativeDriver: false,
          friction: 9,
          tension: 100,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(thumbScale, {
            toValue: 1,
            duration: 90,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    },
    [animatedValue, thumbScale],
  );

  useEffect(() => {
    if (value === isEnabledRef.current) return;

    isEnabledRef.current = value;
    animateToValue(value);
  }, [value, animateToValue]);

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
        thumbScale.stopAnimation();

        Animated.timing(thumbScale, {
          toValue: THUMB_SCALE_PRESSED,
          duration: 80,
          useNativeDriver: false,
        }).start();
      },

      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const startPos = isEnabledRef.current ? TRACK_TRAVEL : 0;
        const moved = startPos + gestureState.dx;
        const clamped = Math.max(0, Math.min(TRACK_TRAVEL, moved));
        animatedValue.setValue(clamped / TRACK_TRAVEL);
      },

      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const targetValue = getTargetValue(gestureState);

        if (targetValue !== isEnabledRef.current) {
          isEnabledRef.current = targetValue;
          animateToValue(targetValue);
          onValueChange(targetValue);
          return;
        }

        animateToValue(isEnabledRef.current, { pulse: false });
      },

      onPanResponderTerminate: () => {
        animateToValue(isEnabledRef.current, { pulse: false });
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
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }, { scale: thumbScale }] },
        ]}
      />
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
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
