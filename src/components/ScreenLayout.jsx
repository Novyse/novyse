import React, { useContext } from "react";
// import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import SmartBackground from "./SmartBackground";
import { ThemeContext } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 

/**
 * Layout personalizzato per applicare il gradiente di sfondo a tutte le schermate
 * @param {React.ReactNode} children - Contenuto della schermata
 * @param {object} style - Stili aggiuntivi per il contenitore
 */
const ScreenLayout = ({ children, style = {}, fullscreen = false }) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets(); 

  return (
    <SmartBackground
      colors={theme.backgroundMainGradient}
      style={[{ flex: 1, paddingTop: fullscreen ? null : insets.top }, style]}
    >
      {children}
    </SmartBackground>
  );
};

export default ScreenLayout;
