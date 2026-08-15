import React, { useEffect } from "react";
import { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type PulseBlobProps = {
  id: string;
  x: number;
  y: number;
  baseRadius: number;
  color1: string;
  color2: string;
  color3: string;
  duration: number;
  moveX?: number;
  moveY?: number;
  pulse: SharedValue<number>;
};

const PulseBlob = ({
  id,
  x,
  y,
  baseRadius,
  color1,
  color2,
  color3,
  duration,
  moveX = 22,
  moveY = 16,
  pulse,
}: PulseBlobProps) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [duration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const baseR = interpolate(
      progress.value,
      [0, 1],
      [baseRadius * 0.88, baseRadius * 1.12],
    );
    const cx = x + interpolate(progress.value, [0, 1], [-moveX, moveX]);
    const cy = y + interpolate(progress.value, [0, 1], [-moveY, moveY]);
    const pulseScale = interpolate(pulse.value, [0, 1], [0.9, 1.1]);

    return {
      cx,
      cy,
      r: baseR * pulseScale,
    };
  });

  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor={color1} stopOpacity="0.9" />
          <Stop offset="55%" stopColor={color2} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={color3} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <AnimatedCircle animatedProps={animatedProps} fill={`url(#${id})`} />
    </>
  );
};

export default PulseBlob;
