import React, { useState, useEffect, useContext } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { Pressable, ViewStyle, StyleProp } from "react-native";

// Cache per le icone importate (lazy loading per performance)
const iconMap: Record<string, any> = {};

// Funzione helper per importare l'icona su richiesta
const importIcon = async (iconName: string): Promise<any | null> => {
  try {
    if (!iconMap[iconName]) {
      const icons = await import("@hugeicons/core-free-icons") as Record<string, any>;
      if (!icons[iconName]) {
        console.error(`Icona ${iconName} non trovata!`);
        return null;
      }
      iconMap[iconName] = icons[iconName];
    }
    return iconMap[iconName];
  } catch (error) {
    console.error("Errore caricamento icona:", error);
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
  const [IconComponent, setIconComponent] = useState<any | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    importIcon(name).then(setIconComponent);
  }, [name]);

  // Determina il colore dell'icona in hover/pressed
  const iconColor = ({ pressed }: { pressed: boolean }): string => {
    const isActive = onPress && (pressed || isHovered);
    if (isActive) {
      return hoverColor || theme.iconHover;
    }
    return color || theme.icon;
  };

  if (!IconComponent) {
    return null;
  }

  // Componente base dell'icona
  const iconElement = ({ pressed }: { pressed: boolean }) => (
    <HugeiconsIcon
      icon={IconComponent}
      size={size}
      color={iconColor({ pressed })}
      strokeWidth={strokeWidth}
      style={style as any}
    />
  );

  // Usa Pressable solo se onPress è definito
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed }) => [
          // style di base se non viene passato altro
          {
            padding: 5,
            borderRadius: 50, // Changed from string "50%" to number 50 for stability if needed, though web might support "50%"
            // transition is not a standard RN property, but might be supported by some libraries/web
          } as ViewStyle,
          // style che posso passare per sovrascrivere gli style di base
          style as ViewStyle,
          // infine sovrascrivo sempre il background // todo (da cambiare non mi piace troppo così) @Matt3opower
          {
            backgroundColor: pressed ? theme.iconPressed : "transparent",
          } as ViewStyle,
        ]}
      >
        {iconElement}
      </Pressable>
    );
  }

  // Altrimenti, restituisci solo l'icona senza Pressable
  return iconElement({ pressed: false });
};

export default Icon;