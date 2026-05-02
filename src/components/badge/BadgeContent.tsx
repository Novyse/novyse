import React from "react";
import { StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";

const BadgeContent = ({ name, icon, textColor }: any) => {
  const defaultTextColor = textColor || "white";
  return (
    <>
      {icon && <Icon name={icon} size={12} color={defaultTextColor} />}
      <AppText
        style={[styles.badgeText, { color: defaultTextColor }]}
        text={name}
      />
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
