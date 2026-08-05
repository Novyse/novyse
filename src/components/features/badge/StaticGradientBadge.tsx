import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BadgeContent from "./BadgeContent";

const StaticGradientBadge = ({ badge }: any) => {
  const { name, icon, color } = badge;
  const { bgColors, textColor, borderColor } = color;

  const safeBgColors = Array.isArray(bgColors)
    ? bgColors.length === 0
      ? ["transparent", "transparent"]
      : bgColors.length === 1
        ? [bgColors[0], bgColors[0]]
        : bgColors
    : ["transparent", "transparent"];

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
        colors={safeBgColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
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

export default StaticGradientBadge;
