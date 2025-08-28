import React from 'react';
import { Text, StyleSheet } from 'react-native';

const StatusMessage = ({ 
  type = 'info', // 'success', 'error', 'info', 'warning'
  text,
  style
}) => {
  if (!text) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          color: 'rgba(26, 139, 18, 0.9)',
          backgroundColor: 'rgba(75, 181, 67, 0.1)',
        };
      case 'error':
        return {
          color: 'rgba(255, 99, 99, 0.9)',
          backgroundColor: 'rgba(255, 99, 99, 0.1)',
        };
      case 'warning':
        return {
          color: 'rgba(255, 166, 0, 0.9)',
          backgroundColor: 'rgba(255, 166, 0, 0.1)',
        };
      case 'info':
      default:
        return {
          color: 'rgba(0, 120, 255, 0.9)',
          backgroundColor: 'rgba(0, 120, 255, 0.1)',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Text style={[
      styles.message,
      { color: typeStyles.color, backgroundColor: typeStyles.backgroundColor },
      style
    ]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
    padding: 12,
    borderRadius: 6,
  },
});

export default StatusMessage;