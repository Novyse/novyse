import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

export interface RoleBadgeProps {
  name: string;
  color?: any;
}

export function parseRoleColor(color?: any): {
  primary: string;
  bg: string;
  border: string;
} {
  let hue = 210;

  if (Array.isArray(color) && color.length > 0) {
    hue = Number(color[0]);
  } else if (typeof color === "number") {
    hue = color;
  } else if (typeof color === "string") {
    try {
      const parsed = JSON.parse(color);
      if (Array.isArray(parsed) && parsed.length > 0) {
        hue = Number(parsed[0]);
      } else if (typeof parsed === "number") {
        hue = parsed;
      }
    } catch {
      const num = parseInt(color, 10);
      if (!isNaN(num)) hue = num;
    }
  }

  if (isNaN(hue)) hue = 210;

  return {
    primary: `hsl(${hue}, 80%, 60%)`,
    bg: `hsla(${hue}, 80%, 60%, 0.12)`,
    border: `hsla(${hue}, 80%, 60%, 0.3)`,
  };
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ name, color }) => {
  const colorStyle = parseRoleColor(color);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colorStyle.bg,
          borderColor: colorStyle.border,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: colorStyle.primary,
          },
        ]}
      />
      <AppText style={[styles.text, { color: colorStyle.primary }]}>
        {name}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default RoleBadge;
