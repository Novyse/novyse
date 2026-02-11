import { View, Text, StyleSheet } from 'react-native';
import HoverAndPressedButton from '@/src/components/HoverAndPressedButton';
import { useRouter } from 'expo-router';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404 - Page Not Found</Text>
      <Text style={styles.message}>
        The page you're looking for doesn't exist.
      </Text>
      <HoverAndPressedButton style={styles.button} onPress={() => router.push('/')}>
        <Text style={styles.buttonText}>Go Home</Text>
      </HoverAndPressedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212', // Dark background
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff', // White text
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#ffffff', // White text
  },
  button: {
    backgroundColor: '#007bff', // Blue button
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});