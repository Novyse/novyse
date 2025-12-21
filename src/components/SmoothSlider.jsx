import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Slider from "@react-native-community/slider";

const AnimatedSlider = Animated.createAnimatedComponent(Slider);

export default function SmoothSlider({
  currentValue,
  maxValue,
  onSeek,
  reset,
  isMoving,
}) {
  const sliderAnim = useRef(new Animated.Value(0)).current;
  const isSeeking = useRef(false);

  useEffect(() => {
    if (isMoving && maxValue > 0 && !isSeeking.current) {
      if (!currentValue) {
        sliderAnim.setValue(0);
      }

      Animated.timing(sliderAnim, {
        toValue: maxValue,
        duration: Math.max((maxValue - currentValue) * 1000, 100),
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      sliderAnim.stopAnimation();
    }
  }, [maxValue, isMoving]);

  useEffect(() => {
    if (reset) {
      sliderAnim.setValue(0);
    }
  }, [reset]);

  const onSlidingStart = () => {
    isSeeking.current = true;
    sliderAnim.stopAnimation();
  };

  const onValueChange = (value) => {
    sliderAnim.setValue(value);
  };

  const onSlidingComplete = (value) => {
    if (isMoving) {
      onSeek(seekValue);
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
      minimumTrackTintColor="#307ecc"
      maximumTrackTintColor="#ffffffff"
      thumbTintColor="#307ecc"
      onSlidingStart={onSlidingStart}
      onValueChange={onValueChange}
      onSlidingComplete={onSlidingComplete}
      tapToSeek={true}
    />
  );
}
