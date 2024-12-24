// Signup.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";

const Signup = () => {

  const { emailValue } = useLocalSearchParams();

  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Signup</Text>
      <Text style={styles.text}>Email: {emailValue}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});

export default Signup;
