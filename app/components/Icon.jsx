// Icon.jsx
import React, { useState, useEffect, useContext } from "react";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ThemeContext } from "@/context/ThemeContext";

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

const Icon = ({ name, size = 24, color, strokeWidth = 1.5, style }) => {
  const [IconComponent, setIconComponent] = useState(null);

  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    importIcon(name).then(setIconComponent);
  }, [name]);

  if (!IconComponent) {
    return null; // Puoi sostituire con un loader: <ActivityIndicator size="small" />
  }

  return (
    <HugeiconsIcon
      icon={IconComponent}
      size={size}
      color={color || theme.icon}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};

export default Icon;