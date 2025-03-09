import { View, Text, StyleSheet } from 'react-native';

const VocalContent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ciao</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: '#000000',
  },
});

export default VocalContent;