import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

const SegmentedSelector = ({
  label,
  value,
  options,
  onValueChange,
  theme,
  disabled = false,
}) => {
  // Calcola l'indice corrente per il marker
  const currentIndex = options.findIndex(opt => opt.value === value);
  const numSegments = options.length;
  const gapPercentage = 2; // Regola questo valore per cambiare la larghezza dei margini visibili (aumentalo se i margini non sono sufficientemente visibili)

  const numGaps = numSegments - 1;
  const totalGapPercent = gapPercentage * numGaps;
  const segmentPercent = (100 - totalGapPercent) / numSegments;

  // Calcola la posizione left per il marker
  const gapsBefore = currentIndex;
  const segmentsBefore = currentIndex;
  const leftPercent = (segmentPercent * segmentsBefore) + (gapPercentage * gapsBefore) + (segmentPercent / 2);

  const getColorAt = (pos) => {
    const startColor = { r: 255, g: 0, b: 255 };
    const endColor = { r: 0, g: 255, b: 255 };
    const r = Math.round(startColor.r * (1 - pos) + endColor.r * pos);
    const g = Math.round(startColor.g * (1 - pos) + endColor.g * pos);
    const b = Math.round(startColor.b * (1 - pos) + endColor.b * pos);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      
      {/* Labels container with gaps */}
      <View style={[styles.labelsContainer, { flexDirection: 'row' }]}>
        {options.map((option, index) => (
          <React.Fragment key={`label-${option.value}`}>
            {index > 0 && <View style={{ width: `${gapPercentage}%` }} />}
            <Text
              style={[
                styles.optionLabel,
                {
                  color: value === option.value ? theme.text : "gray",
                  flex: 1,
                },
                disabled && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </React.Fragment>
        ))}
      </View>

      {/* Gradient Bar with separated segments */}
      <View style={styles.barContainer}>
        <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
          {options.map((option, index) => (
            <React.Fragment key={`bar-${option.value}`}>
              {index > 0 && <View style={{ width: `${gapPercentage}%`, height: '100%' }} />}
              <LinearGradient
                colors={[getColorAt(index / numSegments), getColorAt((index + 1) / numSegments)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, height: '100%', borderRadius: 2 }}
              />
            </React.Fragment>
          ))}
        </View>

        {/* Marker */}
        <View 
          style={[
            styles.marker,
            {
              left: `${leftPercent}%`,
              backgroundColor: theme.background,
            }
          ]} 
        />

        {/* Touchable segments with gaps */}
        <View style={styles.segmentsContainer}>
          <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
            {options.map((option, index) => (
              <React.Fragment key={option.value}>
                {index > 0 && <View style={{ width: `${gapPercentage}%` }} />}
                <TouchableOpacity
                  style={{ flex: 1, height: '100%' }}
                  onPress={() => !disabled && onValueChange(option.value)}
                  disabled={disabled}
                />
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 16,
    fontWeight: "500",
  },
  labelsContainer: {
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  barContainer: {
    height: 4,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    top: -4,
    marginLeft: -6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  segmentsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default SegmentedSelector;