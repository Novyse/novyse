import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import JsonParser from "../utils/JsonParser";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AntDesign from '@expo/vector-icons/AntDesign';

const Signup = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme, width);

  const [form, setForm] = useState({
    password: "",
    confirmpassword: "",
    name: "",
    surname: "",
    handle: "",
  });

  const [showPassword, setShowPassword] = useState({
    password: true,
    confirmpassword: true,
  });

  const [handleAvailable, setHandleAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleTimer, setHandleTimer] = useState(null);

  useEffect(() => {
    // const checkLogged = async () => {
    //   const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
    //   if (storeGetIsLoggedIn === "true") {
    //     router.navigate("/messages");
    //   }
    // };
    // checkLogged();

    const backAction = () => {
      router.navigate("/loginSignup/EmailCheckForm");
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (field === "handle") {
      setIsLoading(true);
      setHandleAvailable(null);
      if (handleTimer) clearTimeout(handleTimer);

      const timer = setTimeout(async () => {
        const available = await JsonParser.handleAvailability(value);
        setHandleAvailable(available);
        setIsLoading(false);
      }, 3000);

      setHandleTimer(timer);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    const { password, confirmpassword, name, surname, handle } = form;
    if (!password) return "Please enter your password.";
    if (password !== confirmpassword) return "Passwords do not match.";
    if (!name) return "Please enter your name.";
    if (!surname) return "Please enter your surname.";
    if (!handle) return "Please enter your handle.";
    if (!handleAvailable) return "Handle is already in use.";
    return null;
  };

  const handleSignup = async () => {
    const error = validateForm();
    if (error) {
      console.log("Validation Error", error);
      return;
    }

    const { password, name, surname, handle } = form;
    const signupResponse = await JsonParser.signupJson(
      emailValue,
      name,
      surname,
      handle,
      password
    );

    if (signupResponse) {
      router.navigate("/loginSignup/EmailCheckForm");
    } else {
      console.log("Signup Failed", "Please try again.");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
          <View style={styles.gridContainer}>
            {[
              { label: "Password", field: "password" },
              { label: "Confirm Password", field: "confirmpassword" },
              { label: "Name", field: "name" },
              { label: "Surname", field: "surname" },
              { label: "Handle", field: "handle" },
            ].map(({ label, field }, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputContainer}>



                  <TextInput
                    style={[
                      styles.input,
                      field === "handle" && handleAvailable === false
                        ? styles.handleInputError
                        : null,
                    ]}
                    secureTextEntry={
                      field.includes("password") && showPassword[field]
                    }
                    onChangeText={(text) => handleChange(field, text)}
                    placeholder={label}
                    placeholderTextColor="#ccc"
                  />

                  

                  {field.includes("password") && (
                    <TouchableOpacity onPress={() => toggleShowPassword(field)}>
                      <AntDesign
                        name={showPassword[field] ? "eyeo" : "eye"}
                        size={17}
                        color={theme.icon}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {field === "handle" && handleAvailable === false && (
                  <Text style={styles.handleTextError}>Handle già in utilizzo</Text>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: handleAvailable ? "#2399C3" : "#999" },
            ]}
            disabled={!handleAvailable}
            onPress={handleSignup}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.icon} />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Signup;

function createStyle(theme, colorScheme, width) {
  const isLargeScreen = width > 600;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.backgroundClassic,
    },
    formContainer: {
      width: "90%",
      maxWidth: 800, // Limite massimo per schermi molto grandi
      paddingHorizontal: 20,
    },
    gridContainer: {
      flexDirection: isLargeScreen ? "row" : "column",
      flexWrap: isLargeScreen ? "wrap" : "nowrap",
      justifyContent: "space-between",
    },
    inputGroup: {
      marginVertical: 10,
      width: isLargeScreen ? "48%" : "100%", // 48% per lasciare spazio tra le colonne
      minWidth: 250, // Larghezza minima per evitare che i campi siano troppo stretti
    },
    label: {
      color: theme.text,
      fontSize: 16,
      marginBottom: 5,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.borderColor || theme.icon,
      borderRadius: 12,
      padding: 10,
    },
    input: {
      outlineStyle: "none",
      flex: 1,
      color: theme.text,
    },
    button: {
      marginTop: 20,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,

    },
    handleInputError: {
      borderBottomColor: "red",
    },
    handleTextError: {
      color: "red",
      marginTop: 5,
    },
  });
}