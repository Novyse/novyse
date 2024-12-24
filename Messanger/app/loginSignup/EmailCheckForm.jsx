import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text, Pressable } from 'react-native';
import APIMethods from '../utils/APImethods';
import Signup from './Signup'; // Import Signup screen
import LoginPassword from './LoginPassword'; // Import LoginPassword screen
import JsonParser from '../utils/JsonParse';
import { usePathname, useRouter } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";

const EmailCheckForm = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);

  const styles = createStyle(theme, colorScheme);

  const router = useRouter();

  const validateEmail = (value) => {
    const emailPattern = /^[\w-.]+@([\w-]+\.)+[\w-]$/;
    return emailPattern.test(value);
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('Per favore inserisci la tua email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Non hai inserito un indirizzo email valido');
      return;
    }

    setError(null); // Clear previous errors

    checkEmailAndNavigate(email);
  };

  const checkEmailAndNavigate = async (emailValue) => {
  
    try {
      const emailResponse = await JsonParser.emailCheckJson(emailValue);
  
      if (emailResponse === "signup") {
        router.push({
            pathname: '/loginSignup/Signup',
            params: {
                emailValue: emailValue,
            }
        });
      } else if (emailResponse === "login") {
        router.push({
            pathname: '/loginSignup/LoginPassword',
            params: {
                emailValue: emailValue,
            }
        });
      } else {
        console.error("Errore: Risposta sconosciuta dall'API.");
      }
    } catch (error) {
      console.error("Errore durante la verifica email:", error);
    }
  };





  return (
    <View style={styles.formContainer}>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="Email"
        placeholderTextColor="#ffffff88"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Pressable style={styles.containerStartButton} onPress={handleSubmit}>
        <Text style={styles.containerStartButtonText}>Invia</Text>
      </Pressable>
    </View>
  );
};



export default EmailCheckForm;

function createStyle(theme, colorScheme) {
    return StyleSheet.create({
        formContainer: {
    width: 250,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'white',
    color: 'white',
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputError: {
    borderBottomColor: 'red',
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  containerStartButton:{
    backgroundColor: theme.button,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 100,
  },
  containerStartButtonText:{
    color: theme.text,
    fontSize: 18,
  }
    })
}
