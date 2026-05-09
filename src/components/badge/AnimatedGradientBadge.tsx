import React, { useEffect, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import BadgeContent from "./BadgeContent";
import { ThemeContext } from "@/context/ThemeContext";

const AnimatedGradientBadge = ({ badge }: any) => {
  const { name, icon, color } = badge;
  const { bgColors, textColor, borderColor } = color;

  const { theme } = useContext(ThemeContext);

  const glareTranslateX = useSharedValue(-80);
  const flowTranslateX = useSharedValue(-60);

  useEffect(() => {
    // Glare Movement
    glareTranslateX.value = withRepeat(
      withSequence(
        withTiming(140, {
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
        }),
        // reset
        withTiming(-80, { duration: 0 }),
      ),
      -1,
      false,
    );

    // Movement of the "color "flow" under the glare
    flowTranslateX.value = withRepeat(
      withSequence(
        withTiming(80, {
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-60, {
          duration: 0,
        }),
      ),
      -1,
      false,
    );
  }, [glareTranslateX, flowTranslateX]);

  const glareStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glareTranslateX.value }, { rotate: "18deg" }],
    opacity: 0.6,
  }));

  const flowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: flowTranslateX.value }],
    opacity: 0.4,
  }));

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          borderColor: borderColor || "transparent",
          borderWidth: borderColor ? 1 : 0,
        },
      ]}
    >
      <LinearGradient
        colors={bgColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Color under glare */}
      <Animated.View
        style={[styles.flowOverlay, flowStyle, { pointerEvents: "none" }]}
      >
        <LinearGradient
          colors={[bgColors[0], bgColors[bgColors.length - 1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Animated Glare */}
      <Animated.View
        style={[styles.glareOverlay, glareStyle, { pointerEvents: "none" }]}
      >
        <LinearGradient
          colors={[
            theme.badgeGlareFirstLast,
            theme.badgeGlareMiddle,
            theme.badgeGlareFirstLast,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.badgeInner}>
        <BadgeContent name={name} icon={icon} textColor={textColor} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  glareOverlay: {
    position: "absolute",
    top: -16,
    bottom: -16,
    width: "30%",
  },
  flowOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "60%",
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
});

export default AnimatedGradientBadge;
