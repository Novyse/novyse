import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';

const ThresholdSlider = ({ 
  label, 
  value, 
  onValueChange, 
  theme,
  disabled = false,
  min = -60,
  max = 0,
  step = 1,
  unit = 'dB'
}) => {
  const styles = createStyles(theme);

  // Funzione per calcolare il colore in base alla posizione (simile a SegmentedSelector)
  const getColorAt = (pos) => {
    const startColor = { r: 255, g: 0, b: 255 };
    const endColor = { r: 0, g: 255, b: 255 };
    const r = Math.round(startColor.r * (1 - pos) + endColor.r * pos);
    const g = Math.round(startColor.g * (1 - pos) + endColor.g * pos);
    const b = Math.round(startColor.b * (1 - pos) + endColor.b * pos);
    return `rgb(${r},${g},${b})`;
  };

  // Genera i colori del gradiente per il track
  const gradientColors = [];
  const numSteps = 10;
  for (let i = 0; i <= numSteps; i++) {
    gradientColors.push(getColorAt(i / numSteps));
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.disabledText]}>
          {label}
        </Text>
        <Text style={[styles.value, disabled && styles.disabledText]}>
          {value}{unit}
        </Text>
      </View>
      
      {/* Custom track con gradiente */}
      <View style={styles.sliderContainer}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientTrack, disabled && styles.disabledTrack]}
        />
        
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onValueChange}
          step={step}
          disabled={disabled}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbStyle={[
            styles.thumb,
            { backgroundColor: theme.text || 'white' },
            disabled && styles.disabledThumb
          ]}
        />
      </View>
      
      <View style={styles.rangeContainer}>
        <Text style={[styles.rangeText, disabled && styles.disabledText]}>
          {min}{unit}
        </Text>
        <Text style={[styles.rangeText, disabled && styles.disabledText]}>
          {max}{unit}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: theme.textTime || '#999',
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  gradientTrack: {
    position: 'absolute',
    height: 4,
    width: '100%',
    borderRadius: 2,
    top: '50%',
    marginTop: -2,
  },
  disabledTrack: {
    opacity: 0.3,
  },
  slider: {
    height: 40,
    width: '100%',
  },
  thumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledThumb: {
    backgroundColor: '#ccc',
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  rangeText: {
    color: theme.textTime || '#666',
    fontSize: 12,
  },
});

export default ThresholdSlider;