import React, {useContext} from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * Componente intelligente per la gestione degli sfondi
 * - Se il colore è "transparent" -> restituisce una View trasparente
 * - Se il colore è un array con tutti "transparent" -> restituisce una View trasparente
 * - Se il colore è un singolo colore -> restituisce una View con quel colore
 * - Se il colore è un array di colori -> restituisce un LinearGradient
 * 
 * @param {string|array} colors - I colori da utilizzare (può essere una stringa, un array, o una chiave del tema)
 * @param {string} backgroundKey - La chiave del colore nel tema (alternativa a colors)
 * @param {object} style - Stili aggiuntivi da applicare
 * @param {object} start - Punto di inizio del gradiente (default: { x: 0, y: 0 })
 * @param {object} end - Punto di fine del gradiente (default: { x: 1, y: 1 })
 * @param {React.ReactNode} children - Componenti figli
 */
const SmartBackground = ({ 
  colors, 
  backgroundKey, 
  style = {}, 
  start = { x: 0, y: 0 }, 
  end = { x: 1, y: 1 }, 
  children, 
  ...props 
}) => {
  const { theme } = useContext(ThemeContext);
  
  // Ottieni il valore del colore dal tema o usa i colors passati direttamente
  const colorValue = colors || (backgroundKey ? theme[backgroundKey] : null);
  
  // Se non esiste la chiave, restituisci una View trasparente
  if (!colorValue) {
    return (
      <View style={[{ backgroundColor: 'transparent' }, style]} {...props}>
        {children}
      </View>
    );
  }
  
  // Se è "transparent" (stringa), restituisci una View trasparente
  if (colorValue === 'transparent') {
    return (
      <View style={[{ backgroundColor: 'transparent' }, style]} {...props}>
        {children}
      </View>
    );
  }
  
  // Se è un array (gradiente)
  if (Array.isArray(colorValue)) {
    // Controlla se tutti i colori nell'array sono "transparent"
    const allTransparent = colorValue.every(color => color === 'transparent');
    
    if (allTransparent) {
      // Se tutti i colori sono trasparenti, restituisci una View trasparente
      return (
        <View style={[{ backgroundColor: 'transparent' }, style]} {...props}>
          {children}
        </View>
      );    } else {
      // Se è un gradiente valido, usa LinearGradient
      return (
        <LinearGradient
          colors={colorValue}
          start={start}
          end={end}
          style={style}
          {...props}
        >
          {children}
        </LinearGradient>
      );
    }
  }
  
  // Se è un colore singolo (stringa), usa una View normale
  return (
    <View style={[{ backgroundColor: colorValue }, style]} {...props}>
      {children}
    </View>
  );
};

export default SmartBackground;
