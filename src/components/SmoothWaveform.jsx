import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, Pressable } from "react-native";

export default function SmoothWaveform({
  waveformData,
  currentValue,
  maxValue,
  onSeek,
  reset,
  isMoving,
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const waveformRef = useRef(null);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setProgress(value);
    });

    return () => {
      progressAnim.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (isMoving && maxValue > 0) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: maxValue,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.stopAnimation();
    }
  }, [maxValue, isMoving]);

  useEffect(() => {
    if (reset) {
      progressAnim.setValue(0);
      setProgress(0);
    }
  }, [reset]);

  const handleWaveformPress = (event) => {
    if (waveformRef.current) {
      waveformRef.current.measure((x, y, width, height, pageX, pageY) => {
        const progressValue = event.nativeEvent.locationX / width;
        onSeek(progressValue);
        progressAnim.setValue(progressValue);
      });
    }
  };

  return (
    <View style={{ width: "100%", height: 40 }} ref={waveformRef}>
      <Pressable onPress={handleWaveformPress} style={{ flex: 1 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", height: "100%" }}
        >
          {waveformData.map((value, index) => {
            const isPlayed = index / waveformData.length < progress;
            return (
              <View
                key={index}
                style={{
                  width: 2,
                  height: value * 20,
                  backgroundColor: isPlayed ? "#0088cc" : "#d3d3d3",
                  marginHorizontal: 1,
                }}
              />
            );
          })}
        </View>
      </Pressable>
    </View>
  );
}
