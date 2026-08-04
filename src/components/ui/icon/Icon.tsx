import React, { useContext, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import { StyleProp, ViewStyle } from "react-native";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

const iconMap: Record<string, any> = {};

const importIcon = async (name: string) => {
  try {
    if (!iconMap[name]) {
      const icons = (await import("@hugeicons/core-free-icons")) as Record<
        string,
        any
      >;
      iconMap[name] = icons[name] ?? null;
    }
    return iconMap[name];
  } catch {
    return null;
  }
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  hoverColor?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const Icon = ({
  name,
  size = 24,
  color,
  hoverColor,
  strokeWidth = 1.5,
  style,
  onPress,
}: IconProps) => {
  const [IconComponent, setIconComponent] = useState<any>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    importIcon(name).then(setIconComponent);
  }, [name]);

  if (!IconComponent) return null;

  const iconColor = color || theme.icon;
  const activeColor = hoverColor || theme.iconHover;

  const icon = (
    <HugeiconsIcon
      icon={IconComponent}
      size={size}
      color={hovered || pressed ? activeColor : iconColor}
      strokeWidth={strokeWidth}
      style={!onPress ? (style as any) : undefined}
    />
  );

  if (!onPress) return icon;

  return (
    <HoverAndPressedButton
      style={style as ViewStyle}
      onPress={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      {icon}
    </HoverAndPressedButton>
  );
};

export default Icon;
