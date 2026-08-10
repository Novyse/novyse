import React from "react";
import { View, StyleSheet } from "react-native";

import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";
import type { TypographyVariant } from "@/constants/typography";

export interface ContextMenuItemProps {
  onPress?: () => void;
  disabled?: boolean;
  iconName?: string;
  iconColor?: string;
  text?: string;
  translationKey?: string;
  translationOptions?: Record<string, unknown>;
  variant?: TypographyVariant;
  children?: React.ReactNode;
}

const ContextMenuItem = ({
  onPress,
  disabled = false,
  iconName,
  iconColor,
  text,
  translationKey,
  translationOptions,
  variant = "default",
  children,
}: ContextMenuItemProps) => {
  return (
    <HoverAndPressedButton
      style={styles.menuItem}
      onPress={onPress}
      disabled={disabled}
    >
      {children ?? (
        <View style={styles.menuItemContent}>
          {iconName ? (
            <View style={styles.iconContainer}>
              <Icon name={iconName} size={20} color={iconColor} />
            </View>
          ) : null}
          {(text || translationKey) && (
            <Typography
              variant={variant}
              size="sm"
              text={text}
              translationKey={translationKey}
              translationOptions={translationOptions}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          )}
        </View>
      )}
    </HoverAndPressedButton>
  );
};

const styles = StyleSheet.create({
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    minWidth: 0,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  iconContainer: {
    flexShrink: 0,
  },
});

export default ContextMenuItem;
