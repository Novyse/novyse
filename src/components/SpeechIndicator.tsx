import React, { useEffect, useContext } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { ThemeContext } from "@/context/ThemeContext";

interface Bar {
  id: number;
  scale: number;
}

const BARS: Bar[] = [
  { id: 1, scale: 0.4 }, // Sinistra esterna (bassa)
  { id: 2, scale: 0.8 }, // Sinistra interna (media)
  { id: 3, scale: 1.0 }, // Centrale (massima)
  { id: 4, scale: 0.8 }, // Destra interna (media)
  { id: 5, scale: 0.4 }, // Destra esterna (bassa)
];

const MIN_DB = -60;
const MAX_DB = 0;

const theme = useContext(ThemeContext);

interface SimpleWaveformProps {
  audioLevel: number;
  color?: string;
  barWidth?: number;
  maxHeight?: number;
}

const SimpleWaveform = ({
  audioLevel,
  color = theme.text,
  barWidth = 3,
  maxHeight = 40,
}: SimpleWaveformProps) => {
  const intensity = useSharedValue<number>(0);

  useEffect(() => {
    let normalized = 0;
    if (audioLevel > MIN_DB) {
      normalized = (audioLevel - MIN_DB) / (MAX_DB - MIN_DB);
    }
    if (normalized < 0) normalized = 0;
    if (normalized > 1) normalized = 1;

    intensity.value = withSpring(normalized, {
      mass: 0.5,
      damping: 10,
      stiffness: 100,
    });
  }, [audioLevel]);

  return (
    <View style={styles.container}>
      {BARS.map((bar) => {
        const animatedStyle = useAnimatedStyle(() => {
          const height = interpolate(
            intensity.value,
            [0, 1],
            [barWidth, maxHeight * bar.scale],
          );

          return {
            height,
            backgroundColor: color,
          };
        });

        return (
          <Animated.View
            key={bar.id}
            style={[
              styles.bar,
              {
                width: barWidth,
                borderRadius: barWidth / 2,
                backgroundColor: color,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bar: {},
});

export default SimpleWaveform;
