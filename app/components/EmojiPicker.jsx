// EmojiPicker.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import EmojiSelector from 'react-native-emoji-selector';

const EmojiPicker = ({ onEmojiSelected, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleEmojiSelected = (emoji) => {
    onEmojiSelected(emoji);
    if (onClose) onClose();
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      <EmojiSelector
        onEmojiSelected={handleEmojiSelected}
        showSearchBar={true}
        showSectionTitles={true}
        showTabs={true}
        showHistory={false}
        columns={isWeb ? 10 : 8}
        placeholder="Search emoji..."
        style={styles.emojiSelector}
      />
    </View>
  );
};

const createStyle = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.modalBackground,
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  closeButton: {
    padding: 4,
  },
  emojiSelector: {
    flex: 1,
  },
});

export default EmojiPicker; // Ensure this line is present