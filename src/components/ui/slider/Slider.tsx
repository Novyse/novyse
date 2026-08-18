import { useCallback, useContext, useEffect, useRef } from "react";
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ThemeContext } from "@/src/context/ThemeContext";

const THUMB_SIZE = 12;
const HIT_HEIGHT = 32; // spazio in altezza effettivo in cui si può cliccare e lo slider reagisce
const SEEK_JS_INTERVAL_MS = 80;

export interface SliderProps {
  value: number;
  maxValue: number;
  onSeekStart?: () => void;
  onSeekChange?: (value: number) => void;
  onSeekComplete?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: ViewStyle;
}

const Slider = ({
  value,
  maxValue,
  onSeekStart,
  onSeekChange,
  onSeekComplete,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style,
}: SliderProps) => {
  const { theme } = useContext(ThemeContext);
  const fillColor = minimumTrackTintColor ?? theme.primary;
  const trackColor = maximumTrackTintColor ?? theme.text + 20;
  const thumbColor = thumbTintColor ?? theme.primary;

  const trackWidth = useSharedValue(1);
  const progress = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isHovered = useSharedValue(false);
  const lastJsEmit = useSharedValue(0);
  const draggingRef = useRef(false);
  const callbacksRef = useRef({ onSeekStart, onSeekChange, onSeekComplete });
  callbacksRef.current = { onSeekStart, onSeekChange, onSeekComplete };

  useEffect(() => {
    if (draggingRef.current) return;
    const next = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
    progress.value = withTiming(next, { duration: 90 });
  }, [value, maxValue, progress]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      if (width > 0) {
        trackWidth.value = width;
      }
    },
    [trackWidth],
  );

  const emitChange = useCallback(
    (ratio: number) => {
      callbacksRef.current.onSeekChange?.(ratio * (maxValue || 0));
    },
    [maxValue],
  );

  const emitComplete = useCallback(
    (ratio: number) => {
      draggingRef.current = false;
      callbacksRef.current.onSeekComplete?.(ratio * (maxValue || 0));
    },
    [maxValue],
  );

  const emitStart = useCallback(() => {
    draggingRef.current = true;
    callbacksRef.current.onSeekStart?.();
  }, []);

  const ratioFromX = (x: number) => {
    "worklet";
    const width = trackWidth.value;
    if (width <= 0) return 0;
    return Math.max(0, Math.min(1, x / width));
  };

  const maybeEmitChange = (ratio: number) => {
    "worklet";
    const now = Date.now();
    if (now - lastJsEmit.value < SEEK_JS_INTERVAL_MS) return;
    lastJsEmit.value = now;
    scheduleOnRN(emitChange, ratio);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-2, 2])
    .onStart((e) => {
      isDragging.value = true;
      const ratio = ratioFromX(e.x);
      progress.value = ratio;
      lastJsEmit.value = 0;
      scheduleOnRN(emitStart);
      scheduleOnRN(emitChange, ratio);
    })
    .onUpdate((e) => {
      const ratio = ratioFromX(e.x);
      progress.value = ratio;
      maybeEmitChange(ratio);
    })
    .onFinalize(() => {
      if (!isDragging.value) return;
      isDragging.value = false;
      scheduleOnRN(emitComplete, progress.value);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const ratio = ratioFromX(e.x);
    progress.value = withTiming(ratio, { duration: 120 });
    scheduleOnRN(emitStart);
    scheduleOnRN(emitComplete, ratio);
  });

  const hoverGesture = Gesture.Hover()
    .onStart(() => {
      isHovered.value = true;
    })
    .onFinalize(() => {
      isHovered.value = false;
    });

  const composedGesture = Gesture.Simultaneous(
    hoverGesture,
    Gesture.Exclusive(panGesture, tapGesture),
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * trackWidth.value,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const active = isDragging.value || isHovered.value;
    return {
      transform: [
        { translateX: progress.value * trackWidth.value - THUMB_SIZE / 2 },
        { scale: withSpring(active ? 1.4 : 1, { duration: 150 }) },
      ],
    };
  });

  const trackContainerStyle = useAnimatedStyle(() => {
    const active = isDragging.value || isHovered.value;
    return {
      height: withTiming(active ? 6 : 4, { duration: 150 }),
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.hitArea, style]} onLayout={onLayout}>
        <Animated.View
          style={[
            styles.track,
            trackContainerStyle,
            { backgroundColor: trackColor },
          ]}
        >
          <Animated.View
            style={[styles.fill, fillStyle, { backgroundColor: fillColor }]}
          />
        </Animated.View>
        <Animated.View
          style={[styles.thumb, thumbStyle, { backgroundColor: thumbColor }]}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    height: HIT_HEIGHT,
    justifyContent: "center",
    minWidth: 0,
  },
  track: {
    width: "100%",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default Slider;
