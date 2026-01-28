import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated, PanResponder } from "react-native";

const CANCEL_THRESHOLD = -100;

const RecordingBar = ({ 
  duration, 
  onCancel, 
  theme 
}) => {
  const styles = createRecordingStyles(theme);
  
  // Animazioni
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // PanResponder per lo swipe-to-cancel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Permetti solo swipe verso sinistra
        if (gesture.dx < 0) {
          slideAnim.setValue(gesture.dx);
          // Riduci opacità mentre swipi
          const newOpacity = 1 - Math.abs(gesture.dx) / 200;
          opacityAnim.setValue(Math.max(0.2, newOpacity));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < CANCEL_THRESHOLD) {
          // Cancellazione confermata
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: -500, duration: 200, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
          ]).start(() => onCancel());
        } else {
          // Torna alla posizione originale (non cancellato)
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(opacityAnim, { toValue: 1, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Helper per formattare il tempo
  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }], opacity: opacityAnim }
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.indicatorContainer}>
        {/* Pallino Rosso Pulsante */}
        <BlinkingDot />
        
        <Text style={styles.timerText}>{formatTime(duration)}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.instructionText}>
           {"< Scorri per annullare"}
        </Text>
      </View>
    </Animated.View>
  );
};

// Sottocomponente per il pallino che lampeggia
const BlinkingDot = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View 
      style={{
        width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff3b30", opacity: fadeAnim, marginRight: 8
      }} 
    />
  );
};

const createRecordingStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1, // Prende tutto lo spazio che aveva il TextInput
    backgroundColor: theme.background || "#2C2C2E", // Colore sfondo chat scuro
    borderRadius: 20,
    marginHorizontal: 5,
    paddingHorizontal: 15,
    height: 45, // Stessa altezza del TextInput
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ff3b30" // Bordo rosso per enfatizzare la registrazione
  },
  indicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"], // Evita che i numeri saltino
  },
  divider: {
    width: 1,
    height: 15,
    backgroundColor: theme.placeholderText || "#666",
    marginHorizontal: 10,
  },
  instructionText: {
    color: theme.placeholderText || "#999",
    fontSize: 14,
  }
});

export default RecordingBar;