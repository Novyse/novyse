import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "@/src/components/Icon";

const BadgeContent = ({ name, icon, textColor }: any) => {
  const defaultTextColor = textColor || "white";
  return (
    <>
      {icon && <Icon name={icon} size={12} color={defaultTextColor} />}
      <Text
        selectable={false}
        style={[styles.badgeText, { color: defaultTextColor }]}
      >
        {name}
      </Text>
    </>
  );
};

const styles = StyleSheet.create({
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    userSelect: "none",
  } as any,
});

export default BadgeContent;
