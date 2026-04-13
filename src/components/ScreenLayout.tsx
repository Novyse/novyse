import React, { useContext } from "react";
import SmartBackground from "./SmartBackground";
import { ThemeContext } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenLayoutProps {
  children: React.ReactNode;
  style?: object;
  fullscreen?: boolean;
}

/**
 * Layout personalizzato per applicare il gradiente di sfondo a tutte le schermate
 * @param children - Contenuto della schermata
 * @param style - Stili aggiuntivi per il contenitore
 */
const ScreenLayout = ({ children, style = {}, fullscreen = false }: ScreenLayoutProps) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  return (
    <SmartBackground
      colors={theme.backgroundMainGradient}
      style={[
        {
          flex: 1,
          paddingTop: fullscreen ? null : insets.top,
          paddingBottom: fullscreen ? null : insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </SmartBackground>
  );
};

export default ScreenLayout;