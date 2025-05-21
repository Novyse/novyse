import { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../constants/Colors";

export const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [colorScheme, setColorScheme] = useState("default");

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
  const theme = Colors[colorScheme] || Colors.default; // Fallback a default se il tema non esiste

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