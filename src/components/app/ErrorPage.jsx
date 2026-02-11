import { View, Text, StyleSheet } from 'react-native';

export default function ErrorPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error</Text>
      <Text style={styles.message}>
        This app can only be opened in one browser window at a time. Please close any other instances of the app and try again. Additionally, this app is not usable in incognito mode.
      </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff', // White text
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ffffff', // White text
  },
});