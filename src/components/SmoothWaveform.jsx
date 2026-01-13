import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, Pressable, ScrollView } from "react-native";
import { defaultWaveform } from "@/src/utils/storage/file/media";

export default function SmoothWaveform({
  waveformData = defaultWaveform,
  currentValue,
  maxValue,
  playbackRate = 1,
  onSeek,
  reset,
  isMoving,
}) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);
  const waveformRef = useRef(null);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setProgress(value / maxValue);
    });

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [maxValue]);

  useEffect(() => {
    if (isMoving && maxValue > 0) {
      if (!currentValue) {
        progressAnim.setValue(0);
      }

      Animated.timing(progressAnim, {
        toValue: maxValue,
        duration:
          Math.max((maxValue - currentValue) * 1000, 100) / playbackRate,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.stopAnimation();
    }
  }, [maxValue, isMoving, playbackRate]);

  useEffect(() => {
    if (reset) {
      progressAnim.setValue(0);
    }
  }, [reset]);

  const handleWaveformPress = (event) => {
    if (waveformRef.current) {
      waveformRef.current.measure((x, y, width, height, pageX, pageY) => {
        const relativeX = event.nativeEvent.pageX - pageX;
        const progressValue = Math.max(0, Math.min(1, relativeX / width));
        const seekValue = progressValue * maxValue;
        if (isMoving) {
          onSeek(seekValue);
        }
        progressAnim.setValue(seekValue);

        if (isMoving) {
          Animated.timing(progressAnim, {
            toValue: maxValue,
            duration: Math.max((maxValue - seekValue) * 1000, 100),
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();
        }
      });
    }
  };

  return (
    <View style={{ width: "100%", height: 40 }} ref={waveformRef}>
      <Pressable onPress={handleWaveformPress} style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: "100%",
            }}
          >
            {waveformData.map((value, index) => {
              const isPlayed = index / waveformData.length < progress;
              return (
                <View
                  key={index}
                  style={{
                    width: 3,
                    height: value * 20,
                    minHeight: 3,
                    backgroundColor: isPlayed ? "#0088cc" : "#d3d3d3",
                    marginHorizontal: 0.5,
                    borderRadius: 10,
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </Pressable>
    </View>
  );
}
