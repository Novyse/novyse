import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, ThemeRegistry } from "@/constants/Colors";

// Define the shape of a single theme
export type Theme = typeof Colors.default;

export type AppearanceMode = "light" | "dark" | "system";

// Define the shape of the context value
interface ThemeContextType {
  appearanceMode: AppearanceMode;
  setAppearanceMode: (mode: AppearanceMode) => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  theme: Theme;
  resolvedMode: "light" | "dark";
  setColorScheme: (scheme: string) => void;
}

// Initial default value for the context
export const ThemeContext = createContext<ThemeContextType>({
  appearanceMode: "system",
  setAppearanceMode: () => {},
  colorTheme: "default",
  setColorTheme: () => {},
  theme: Colors.default,
  resolvedMode: "dark",
  setColorScheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

import { useColorScheme } from "react-native";

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const systemColorScheme = useColorScheme();
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("system");
  const [colorTheme, setColorTheme] = useState<string>("default");

  // Carica le preferenze all'avvio
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedAppearance, savedTheme] = await Promise.all([
          AsyncStorage.getItem("appearanceMode"),
          AsyncStorage.getItem("colorTheme"),
        ]);
        
        if (savedAppearance) setAppearanceMode(savedAppearance as AppearanceMode);
        if (savedTheme) setColorTheme(savedTheme);
      } catch (error) {
        console.error("Errore nel caricamento del tema:", error);
      }
    };
    loadSettings();
  }, []);

  // Salva le preferenze quando cambiano
  useEffect(() => {
    AsyncStorage.setItem("appearanceMode", appearanceMode);
    AsyncStorage.setItem("colorTheme", colorTheme);
  }, [appearanceMode, colorTheme]);

  // Logica di risoluzione del tema  
  const getResolvedMode = (): "light" | "dark" => {
    const themeConfig = ThemeRegistry[colorTheme];
    
    // Se il tema supporta solo una modalità, usiamo quella
    if (themeConfig && themeConfig.modes.length === 1) {
      return themeConfig.modes[0];
    }
    
    // Se il tema supporta entrambe o non è definito, seguiamo la preferenza
    if (appearanceMode === "system") {
      return systemColorScheme || "dark";
    }
    return appearanceMode;
  };

  const resolvedMode = getResolvedMode();
  
  // Mapping dei colori in base al tema e alla modalità risolta
  const themeKey = ThemeRegistry[colorTheme]?.colors[resolvedMode] || colorTheme;
  
  // @ts-ignore
  const theme = Colors[themeKey] || Colors.default;

  return (
    <ThemeContext.Provider
      value={{
        appearanceMode,
        setAppearanceMode,
        colorTheme,
        setColorTheme,
        theme,
        resolvedMode,
        setColorScheme: setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);