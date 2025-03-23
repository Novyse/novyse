import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

const ThemesPage = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Temi</Text>
      <Pressable style={styles.themeOption} onPress={() => setTheme('light')}>
        <Text style={styles.themeOptionText}>Chiaro</Text>
      </Pressable>
      <Pressable style={styles.themeOption} onPress={() => setTheme('dark')}>
        <Text style={styles.themeOptionText}>Scuro</Text>
      </Pressable>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Indietro</Text>
      </Pressable>
    </View>
  );
};

const createStyle = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
  },
  themeOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  themeOptionText: {
    color: theme.text,
    fontSize: 18,
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: theme.text,
    fontSize: 16,
  },
});

export default ThemesPage;