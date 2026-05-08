import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";

// Define the shape of a single theme
export type Theme = typeof Colors.default;

// Define the shape of the context value
interface ThemeContextType {
  text: string | undefined;
  colorScheme: string;
  setColorScheme: (scheme: string) => void;
  theme: Theme;
}

// Initial default value for the context
export const ThemeContext = createContext<ThemeContextType>({
  colorScheme: "default",
  setColorScheme: () => {},
  theme: Colors.default,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [colorScheme, setColorScheme] = useState<string>("default");

  // Carica il tema salvato all'avvio
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("userTheme");
        if (savedTheme) {
          setColorScheme(savedTheme);
        }
      } catch (error) {
        console.error("Errore nel caricamento del tema:", error);
      }
    };
    loadTheme();
  }, []);

  // Salva il tema ogni volta che cambia
  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem("userTheme", colorScheme);
      } catch (error) {
        console.error("Errore nel salvataggio del tema:", error);
      }
    };
    saveTheme();
  }, [colorScheme]);

  // Usa il colorScheme come chiave per accedere al tema corrispondente
  // @ts-ignore - colorScheme is a string, but Colors has specific keys
  const theme = Colors[colorScheme] || Colors.default;

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        setColorScheme,
        theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);