import React, { useState, useEffect, useContext } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { Pressable } from "react-native";

// Cache per le icone importate (lazy loading per performance)
const iconMap = {};

// Funzione helper per importare l'icona su richiesta
const importIcon = async (iconName) => {
  try {
    if (!iconMap[iconName]) {
      const icons = await import("@hugeicons/core-free-icons");
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

const Icon = ({
  name,
  size = 24,
  color,
  hoverColor,
  strokeWidth = 1.5,
  style,
  onPress,
}) => {
  const [IconComponent, setIconComponent] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    importIcon(name).then(setIconComponent);
  }, [name]);

  // Determina il colore dell'icona in hover/pressed
  const iconColor = ({ pressed }) => {
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
  const iconElement = ({ pressed }) => (
    <HugeiconsIcon
      icon={IconComponent}
      size={size}
      color={iconColor({ pressed })}
      strokeWidth={strokeWidth}
      style={style}
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
            borderRadius: "50%",
            transition: "background-color 0.2s ease",
          },
          // style che posso passare per sovrascrivere gli style di base
          style,
          // infine sovrascrivo sempre il background // todo (da cambiare non mi piace troppo così) @Matt3opower
          {
            backgroundColor: pressed ? theme.iconPressed : "transparent",
          },
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
