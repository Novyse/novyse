import { useContext, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import { StyleProp, ViewStyle } from "react-native";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import { iconMap, type IconName } from "@/src/utils/iconMap";

interface IconProps {
  name: IconName;
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { theme } = useContext(ThemeContext);

  if (!iconMap[name]) {
    console.log("🔴", name);
  }

  const glyph = iconMap[name];
  if (!glyph) return null;

  const iconColor = color || theme.icon;
  const activeColor = hoverColor || theme.iconHover;

  const icon = (
    <HugeiconsIcon
      icon={glyph as any}
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
