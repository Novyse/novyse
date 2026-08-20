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
const THUMB_SIZE = 19;
const THUMB_STRETCH_EXTRA = 8;
const THUMB_SCALE_PRESSED = 0.88;
const THUMB_SCALE_TOGGLE = 0.72;

const Switch: React.FC<SwitchProps> = ({ value, onValueChange }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const thumbStretch = useRef(new Animated.Value(0)).current;
  const isEnabledRef = useRef<boolean>(value);

  const animateToValue = useCallback(
    (enabled: boolean, { pulse = true }: { pulse?: boolean } = {}) => {
      animatedValue.stopAnimation();
      thumbScale.stopAnimation();
      thumbStretch.stopAnimation();

      const stretchRelease = Animated.timing(thumbStretch, {
        toValue: 0,
        duration: 110,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });

      const positionAnimation = Animated.spring(animatedValue, {
        toValue: enabled ? 1 : 0,
        useNativeDriver: false,
        friction: 8,
        tension: 100,
      });

      if (!pulse) {
        Animated.parallel([
          positionAnimation,
          stretchRelease,
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
        stretchRelease,
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
    [animatedValue, thumbScale, thumbStretch],
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
        thumbStretch.stopAnimation();

        Animated.parallel([
          Animated.timing(thumbScale, {
            toValue: THUMB_SCALE_PRESSED,
            duration: 80,
            useNativeDriver: false,
          }),
          Animated.timing(thumbStretch, {
            toValue: 1,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]).start();
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

  const thumbWidth = thumbStretch.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_SIZE, THUMB_SIZE + THUMB_STRETCH_EXTRA],
  });

  const translateX = Animated.add(
    3,
    Animated.multiply(
      animatedValue,
      Animated.subtract(
        TRACK_TRAVEL,
        Animated.multiply(thumbStretch, THUMB_STRETCH_EXTRA),
      ),
    ),
  );

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
          {
            width: thumbWidth,
            transform: [{ translateX }, { scale: thumbScale }],
          },
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
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 20,
      backgroundColor: theme.text,
      boxShadow: `0px 2px 3px ${theme.shadowColor}`,
    },
  });

export default Switch;
