import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ThemeContext } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Archiviazione</Text>
      <Text style={styles.storageInfo}>Informazioni sull'archiviazione...</Text>
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
  storageInfo: {
    color: theme.text,
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: theme.text,
    fontSize: 16,
  },
});

export default StoragePage;