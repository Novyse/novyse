import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const PARTICLE_COUNT = 18;

export interface ReactionParticlesRef {
  trigger: (emoji: string, x: number, y: number) => void;
}

interface ParticleData {
  id: string;
  emoji: string;
  angle: number;
  speed: number;
  size: number;
}

interface Burst {
  id: string;
  x: number;
  y: number;
  particles: ParticleData[];
}

const ParticleItem = ({
  emoji,
  x,
  y,
  angle,
  speed,
  size,
  onFinished,
}: {
  emoji: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  onFinished?: () => void;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      {
        duration: 1100 + Math.random() * 400, // Slower, more deliberate duration
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished && onFinished) {
          runOnJS(onFinished)();
        }
      },
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Quad deceleration curve so particles pop out fast then float smoothly
    const easeOutQuad = 1 - (1 - progress.value) * (1 - progress.value);
    const distance = easeOutQuad * speed;

    const tx = Math.cos(angle) * distance;
    // Upward float drift over time
    const ty = Math.sin(angle) * distance - progress.value * 35;

    // Scale rises quickly, hangs at full size, then shrinks/fades away
    let scale = 0;
    if (progress.value < 0.2) {
      scale = (progress.value / 0.2) * size;
    } else if (progress.value < 0.75) {
      scale = size;
    } else {
      scale = (1 - (progress.value - 0.75) / 0.25) * size;
    }

    // Fade opacity out towards the very end
    const opacity =
      progress.value < 0.7 ? 1.0 : 1.0 - (progress.value - 0.7) / 0.3;

    // Slower rotational velocity
    const rotation = progress.value * 140 * (angle > Math.PI ? 1 : -1);

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: Math.max(0, scale) },
        { rotate: `${rotation}deg` },
      ],
      opacity: Math.max(0, opacity),
    };
  });

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          left: x - 10,
          top: y - 10,
        },
        animatedStyle,
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

export const ReactionParticles = forwardRef<ReactionParticlesRef, {}>(
  (props, ref) => {
    const [bursts, setBursts] = useState<Burst[]>([]);

    useImperativeHandle(ref, () => ({
      trigger: (emoji: string, x: number, y: number) => {
        const burstId = Math.random().toString(36).substring(7);

        const cleanEmoji = emoji ? emoji.trim() : "❤️";

        const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
          const angle =
            (i / PARTICLE_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.3;
          const speed = 40 + Math.random() * 60; // slightly wider dispersion
          const size = 0.8 + Math.random() * 0.7; // slightly larger for visibility

          return {
            id: `${burstId}-${i}`,
            emoji: cleanEmoji,
            angle,
            speed,
            size,
          };
        });

        setBursts((prev) => [
          ...prev,
          {
            id: burstId,
            x,
            y,
            particles,
          },
        ]);
      },
    }));

    const removeBurst = (burstId: string) => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    };

    return (
      <View style={styles.container} pointerEvents="none">
        {bursts.map((burst) => (
          <View
            key={burst.id}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {burst.particles.map((p, index) => (
              <ParticleItem
                key={p.id}
                emoji={p.emoji}
                x={burst.x}
                y={burst.y}
                angle={p.angle}
                speed={p.speed}
                size={p.size}
                onFinished={
                  index === 0 ? () => removeBurst(burst.id) : undefined
                }
              />
            ))}
          </View>
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: "absolute",
    fontSize: 16,
  },
});

export default ReactionParticles;
