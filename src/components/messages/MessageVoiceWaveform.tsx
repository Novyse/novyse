import React, { useEffect, useRef, useState, useContext } from "react";
import { Animated, Easing, View, ScrollView, PanResponder } from "react-native";
import { defaultWaveform } from "@/src/utils/storage/file/media";
import { ThemeContext } from "@/src/context/ThemeContext";

interface MessageVoiceWaveformProps {
  waveformData?: number[];
  currentValue: number;
  maxValue: number;
  playbackRate?: number;
  onSeek: (value: number) => void;
  reset: boolean;
  isMoving: boolean;
}

export default function MessageVoiceWaveform({
  waveformData = defaultWaveform,
  currentValue,
  maxValue,
  playbackRate = 1,
  onSeek,
  reset,
  isMoving,
}: MessageVoiceWaveformProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState<number>(0);
  const waveformRef = useRef<View>(null);
  const layoutRef = useRef({ width: 0, pageX: 0 });
  const isDragging = useRef(false);

  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setProgress(value / maxValue);
    });

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [maxValue]);

  useEffect(() => {
    if (isMoving && maxValue > 0 && !isDragging.current) {
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
    } else if (!isDragging.current) {
      progressAnim.stopAnimation();
      // Only set to currentValue if not currently dragging
      if (!isMoving && currentValue >= 0) {
        progressAnim.setValue(currentValue);
      }
    }
  }, [maxValue, isMoving, playbackRate, currentValue]);

  useEffect(() => {
    if (reset) {
      progressAnim.setValue(0);
    }
  }, [reset]);

  const updateProgress = (pageX: number) => {
    const { width, pageX: viewPageX } = layoutRef.current;
    if (width > 0) {
      const relativeX = pageX - viewPageX;
      const progressValue = Math.max(0, Math.min(1, relativeX / width));
      const seekValue = progressValue * maxValue;
      progressAnim.setValue(seekValue);
      return seekValue;
    }
    return 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        progressAnim.stopAnimation();

        if (waveformRef.current) {
          waveformRef.current.measure((x, y, width, height, pageX, pageY) => {
            layoutRef.current = { width, pageX };
            updateProgress(evt.nativeEvent.pageX);
          });
        }
      },
      onPanResponderMove: (evt) => {
        updateProgress(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: (evt) => {
        isDragging.current = false;
        const seekValue = updateProgress(evt.nativeEvent.pageX);

        // Seek works even when paused
        onSeek(seekValue);

        if (isMoving) {
          Animated.timing(progressAnim, {
            toValue: maxValue,
            duration:
              Math.max((maxValue - seekValue) * 1000, 100) / playbackRate,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: (evt) => {
        isDragging.current = false;
        const seekValue = updateProgress(evt.nativeEvent.pageX);
        onSeek(seekValue);
      },
    }),
  ).current;

  return (
    <View style={{ width: "100%", height: 40 }} ref={waveformRef}>
      <View {...panResponder.panHandlers} style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
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
                    backgroundColor: isPlayed ? theme.primary : theme.subtitle,
                    marginHorizontal: 0.5,
                    borderRadius: 10,
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
