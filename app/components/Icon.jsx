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

  // Determina il colore dell'icona
  const iconColor = ({ pressed }) =>
    onPress && (pressed || isHovered) ? "#bcbcbcff" : color || theme.icon;

  if (!IconComponent) {
    return null; // Puoi sostituire con un loader: <ActivityIndicator size="small" />
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
          style,
          {
            backgroundColor: pressed ? "rgba(0, 0, 0, 0.3)" : "transparent", // Colore di sfondo quando premuto
            padding: 5, // Padding per migliorare l'area di tocco e l'effetto visivo
            borderRadius: "50%", // Bordi arrotondati per l'effetto ripple
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
