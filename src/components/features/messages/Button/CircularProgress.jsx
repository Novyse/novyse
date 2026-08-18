import { useEffect, useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Icon from "@/src/components/ui/icon/Icon";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { ThemeContext } from "@/src/context/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CIRCLE_SIZE = 34;
const STROKE_WIDTH = 3;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CircularProgress = ({ progress, onCancel }) => {
  const { theme } = useContext(ThemeContext);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    // progress is between 0 and 1
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 50,
    });
  }, [progress, animatedProgress]);

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset =
      CIRCUMFERENCE - CIRCUMFERENCE * animatedProgress.value;
    return { strokeDashoffset };
  });

  return (
    <Pressable onPress={onCancel} style={styles.container}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        {/* Background Circle */}
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke={theme.text}
          strokeWidth={STROKE_WIDTH}
          strokeOpacity={0.2}
          fill="transparent"
        />
        {/* Progress Circle */}
        <AnimatedCircle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke={theme.text}
          strokeWidth={STROKE_WIDTH}
          fill="transparent"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedCircleProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2})`}
        />
      </Svg>
      {onCancel && (
        <View style={styles.iconContainer}>
          <Icon name="Cancel01Icon" size={16} color={theme.text} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CircularProgress;
