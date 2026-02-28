import React from "react";
import { View, StyleSheet } from "react-native";
import BadgeContent from "./BadgeContent";

const SolidBadge = ({ badge }: any) => {
  const { name, icon, color } = badge;
  const { value, textColor, borderColor } = color;

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: value,
          borderColor: borderColor || "transparent",
          borderWidth: borderColor ? 1 : 0,
        },
      ]}
    >
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

export default SolidBadge;
