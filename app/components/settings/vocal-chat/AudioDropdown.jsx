import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';

const AudioDropdown = ({ 
  label, 
  value, 
  options, 
  onValueChange, 
  theme,
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSelect = (selectedValue) => {
    onValueChange(selectedValue);
    setIsVisible(false);
  };

  const getDisplayText = () => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity 
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.dropdownText, disabled && styles.disabledText]}>
          {getDisplayText()}
        </Text>
        <Text style={[styles.arrow, disabled && styles.disabledText]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    color: theme.text,
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.border || '#ddd',
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownText: {
    color: theme.text,
    fontSize: 16,
    flex: 1,
  },
  disabledText: {
    color: theme.textSecondary || '#999',
  },
  arrow: {
    color: theme.text,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    maxHeight: 300,
    width: '80%',
    maxWidth: 300,
  },
  option: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border || '#eee',
  },
  selectedOption: {
    backgroundColor: theme.primary || '#007AFF',
  },
  optionText: {
    color: theme.text,
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AudioDropdown;