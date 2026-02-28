import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BadgeContent from "./BadgeContent";

const AnimatedGradientBadge = ({ badge }: any) => {
  const { name, icon, color } = badge;
  const { bgColors, textColor, borderColor } = color;

  if (Platform.OS === "web") {
    // Implementazione Web-first: Performance massime (60fps in GPU) tramite CSS nativo
    const cssGradient = `linear-gradient(270deg, ${bgColors.join(", ")})`;

    // Iniettiamo i keyframes globalmente (se non esistono) per animare il background
    if (
      typeof document !== "undefined" &&
      !document.getElementById("badge-gradient-keyframes")
    ) {
      const style = document.createElement("style");
      style.id = "badge-gradient-keyframes";
      style.innerHTML = `
        @keyframes badgeGradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;
      document.head.appendChild(style);
    }

    return (
      <View
        style={[
          styles.badgeContainer,
          {
            borderColor: borderColor || "transparent",
            borderWidth: borderColor ? 1 : 0,
            // Proprietà Web React Native passate forzando le stringhe CSS dirette
            backgroundImage: cssGradient,
            backgroundSize: "200% 200%",
            animation: "badgeGradientFlow 3s ease infinite",
          } as any, // Castato and any per iniettare raw CSS rules
        ]}
      >
        <View style={styles.badgeInner}>
          <BadgeContent name={name} icon={icon} textColor={textColor} />
        </View>
      </View>
    );
  }

  // Fallback per Native (iOS/Android) usando il cross-fade di opacità supportato nativamente
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const reversedColors = [...bgColors].reverse();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacityAnim]);

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
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: opacityAnim }]}
      >
        <LinearGradient
          colors={reversedColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
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
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
});

export default AnimatedGradientBadge;
