import React, { useContext } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SmartBackground from './SmartBackground';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * Layout personalizzato per applicare il gradiente di sfondo a tutte le schermate
 * @param {React.ReactNode} children - Contenuto della schermata
 * @param {object} style - Stili aggiuntivi per il contenitore
 */
const ScreenLayout = ({ children, style = {} }) => {
  const { theme } = useContext(ThemeContext);

  return (
    <SafeAreaProvider>
      <SmartBackground
        colors={theme.backgroundMainGradient}
        style={[{ flex: 1 }, style]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {children}
        </SafeAreaView>
      </SmartBackground>
    </SafeAreaProvider>
  );
};

export default ScreenLayout;
