import React, { useContext, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Slider from "@react-native-community/slider";
import { ThemeContext } from "@/context/ThemeContext"; 

const AnimatedSlider = Animated.createAnimatedComponent(Slider);

interface SmoothSliderProps {
  currentValue: number;
  maxValue: number;
  playbackRate?: number;
  onSeek: (value: number) => void;
  reset: boolean;
  isMoving: boolean;
}

export default function SmoothSlider({
  currentValue,
  maxValue,
  playbackRate = 1,
  onSeek,
  reset,
  isMoving,
}: SmoothSliderProps) {
  const { theme } = useContext(ThemeContext);

  const sliderAnim = useRef(new Animated.Value(0)).current;
  const isSeeking = useRef<boolean>(false);

  useEffect(() => {
    if (isMoving && maxValue > 0 && !isSeeking.current) {
      if (!currentValue) {
        sliderAnim.setValue(0);
      }

      Animated.timing(sliderAnim, {
        toValue: maxValue,
        duration: Math.max((maxValue - currentValue) * 1000, 100) / playbackRate,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      sliderAnim.stopAnimation();
    }
  }, [maxValue, isMoving, playbackRate]);

  useEffect(() => {
    if (reset) {
      sliderAnim.setValue(0);
    }
  }, [reset]);

  const onSlidingStart = (): void => {
    isSeeking.current = true;
    sliderAnim.stopAnimation();
  };

  const onValueChange = (value: number): void => {
    sliderAnim.setValue(value);
  };

  const onSlidingComplete = (value: number): void => {
    if (isMoving) {
      onSeek(value); // fix: era `seekValue` (variabile non definita)
    }
    isSeeking.current = false;

    if (isMoving && maxValue > 0) {
      sliderAnim.setValue(value);

      Animated.timing(sliderAnim, {
        toValue: maxValue,
        duration: Math.max((maxValue - value) * 1000, 100),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  };

  return (
    <AnimatedSlider
      style={{ width: "100%", height: 40 }}
      minimumValue={0}
      maximumValue={maxValue | 1}
      value={isSeeking.current ? undefined : sliderAnim}
      minimumTrackTintColor={theme.primary}
      maximumTrackTintColor={theme.secondary}
      thumbTintColor={theme.primary}
      onSlidingStart={onSlidingStart}
      onValueChange={onValueChange}
      onSlidingComplete={onSlidingComplete}
      tapToSeek={true}
    />
  );
}