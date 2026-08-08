import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";

const BadgeContent = ({ name, icon, textColor }: any) => {
  const { theme } = useContext(ThemeContext);
  const defaultTextColor = textColor || theme.text;
  return (
    <>
      {icon && <Icon name={icon} size={12} color={defaultTextColor} />}
      <Typography
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
