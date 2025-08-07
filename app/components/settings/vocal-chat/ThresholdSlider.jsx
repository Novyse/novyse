import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';

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
      
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={onValueChange}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={disabled ? '#ccc' : (theme.primary || '#007AFF')}
        maximumTrackTintColor={disabled ? '#eee' : (theme.border || '#ddd')}
        thumbStyle={disabled ? styles.disabledThumb : styles.thumb}
      />
      
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
    color: theme.primary || '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: theme.textSecondary || '#999',
  },
  slider: {
    height: 40,
  },
  thumb: {
    backgroundColor: theme.primary || '#007AFF',
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
    color: theme.textSecondary || '#666',
    fontSize: 12,
  },
});

export default ThresholdSlider;