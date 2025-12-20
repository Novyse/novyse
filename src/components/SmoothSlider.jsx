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

  useEffect(() => {
    if (isMoving && maxValue > 0) {
      if (!currentValue) {
        sliderAnim.setValue(0);
      }

      Animated.timing(sliderAnim, {
        toValue: 1,
        duration: maxValue,
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

  return (
    <AnimatedSlider
      style={{ width: "100%", height: 40 }}
      minimumValue={0}
      maximumValue={1}
      onSlidingComplete={onSeek}
      minimumTrackTintColor="#307ecc"
      maximumTrackTintColor="#ffffffff"
      thumbTintColor="#307ecc"
      value={sliderAnim}
      disabled={isMoving}
    />
  );
}
