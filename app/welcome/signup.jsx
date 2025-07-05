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
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import JsonParser from "../utils/JsonParser";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { LoginColors } from "@/constants/LoginColors";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";

const Signup = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const loginTheme = "default";
  const privacyPolicyLink = "https://www.novyse.com/legal/privacy-policy";
  const tosLink = "https://www.novyse.com/legal/terms-of-service";
  const [privacy_policy_accepted, SetPrivacy_policy_accepted] = useState(false);
  const [terms_of_service_accepted, setTerms_of_service_accepted] =
    useState(false);

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$#@!?])[^\s]{8,32}$/;

  const isPasswordValid = (pwd) => passwordRegex.test(pwd);

  // Ottieni la larghezza dello schermo e definisci il breakpoint
  const isSmallScreen = width < 936;
  const styles = createStyle(loginTheme, isSmallScreen);

  const [form, setForm] = useState({
    password: "",
    name: "",
    surname: "",
    handle: "",
  });

  const [showPassword, setShowPassword] = useState({
    password: true,
  });

  const [handleAvailable, setHandleAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleTimer, setHandleTimer] = useState(null);
  const [error, setError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false); // New state for form validity

  useEffect(() => {
    const backAction = () => {
      router.navigate("/welcome/emailcheck");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  // Effect to check form validity whenever 'form' or 'handleAvailable' changes
  useEffect(() => {
    const { password, name, surname, handle } = form;
    // Check if all fields are filled AND handle is available AND not currently checking handle availability
    const allFieldsFilled =
      password !== "" && name !== "" && surname !== "" && handle !== "";
    setIsFormValid(allFieldsFilled && handleAvailable === true && !isLoading);
  }, [form, handleAvailable, isLoading]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (error) setError(null);

    if (field === "handle") {
      setIsLoading(true);
      setHandleAvailable(null); // Reset handle availability when handle changes
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
    const { password, name, surname, handle } = form;
    if (!password) return "Please enter your password.";
    if (!isPasswordValid(password)) {
      return "Password must be 8-32 chars, include upper/lowercase, a number and a special character ($#@!?)";
    }
    if (!name) return "Please enter your name.";
    if (!surname) return "Please enter your surname.";
    if (!handle) return "Please enter your handle.";
    if (handleAvailable === false) return "Handle is already in use.";
    return null;
  };

  const inputFields = [
    { label: "Name", field: "name", placeholder: "Name" },
    { label: "Surname", field: "surname", placeholder: "Surname" },
    { label: "Password", field: "password", placeholder: "Password" },
    { label: "Handle", field: "handle", placeholder: "Handle" },
  ];

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { password, name, surname, handle } = form;
      const signupResponse = await JsonParser.signupJson(
        emailValue,
        name,
        surname,
        handle,
        password,
        privacy_policy_accepted,
        terms_of_service_accepted
      );

      if (signupResponse) {
        router.navigate("/welcome/emailcheck");
      } else {
        setError("Signup failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = ({ label, field, placeholder }) => (
    <View key={field} style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          field === "handle" && handleAvailable === false
            ? styles.inputError
            : null,
          field === "handle" && handleAvailable === true
            ? styles.inputSuccess // Apply success style
            : null,
        ]}
      >
        <TextInput
          style={styles.textInput}
          secureTextEntry={field.includes("password") && showPassword[field]}
          onChangeText={(text) => handleChange(field, text)}
          placeholder={placeholder || label}
          placeholderTextColor={LoginColors[loginTheme].placeholderTextInput}
          value={form[field]}
        />

        {field.includes("password") && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => toggleShowPassword(field)}
          >
            <HugeiconsIcon
              icon={showPassword[field] ? ViewOffIcon : ViewIcon}
              size={20}
              color={LoginColors[loginTheme].iconColor || "rgba(0,0,0,0.6)"}
              strokeWidth={1.5}
            />
          </TouchableOpacity>
        )}
      </View>

      {field === "handle" && handleAvailable === false && (
        <Text style={styles.handleErrorText}>Handle already in use</Text>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={
        isSmallScreen
          ? ["transparent", "transparent"]
          : LoginColors[loginTheme].background
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        style="dark"
        backgroundColor={LoginColors[loginTheme].backgroundCard}
        translucent={false}
        hidden={false}
      />

      {/* Card */}
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            style={styles.logo}
            source={require("../../assets/images/logo-novyse-nobg-less-margin.png")}
          />

          <Text style={styles.title}>Sign Up</Text>

          <View style={styles.formWrapper}>
            <View style={styles.gridContainer}>
              {inputFields.map(renderInputField)}
            </View>

            <View style={{ marginBottom: 16 }}>
              {/* Privacy Policy */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => SetPrivacy_policy_accepted((prev) => !prev)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: privacy_policy_accepted
                      ? LoginColors[loginTheme].backgroundSubmitButton
                      : "#ccc",
                    backgroundColor: privacy_policy_accepted
                      ? LoginColors[loginTheme].backgroundSubmitButton
                      : "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 8,
                  }}
                >
                  {privacy_policy_accepted && (
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>✓</Text>
                  )}
                </TouchableOpacity>
                <Text>
                  I accept{" "}
                  <Text
                    style={[styles.link, { textDecorationLine: "underline" }]}
                    onPress={() =>
                      Platform.OS === "web"
                        ? window.open(privacyPolicyLink, "_blank")
                        : Linking.openURL(privacyPolicyLink)
                    }
                  >
                    privacy policy
                  </Text>
                </Text>
              </View>

              {/* Terms of Service */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  onPress={() => setTerms_of_service_accepted((prev) => !prev)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: terms_of_service_accepted
                      ? LoginColors[loginTheme].backgroundSubmitButton
                      : "#ccc",
                    backgroundColor: terms_of_service_accepted
                      ? LoginColors[loginTheme].backgroundSubmitButton
                      : "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 8,
                  }}
                >
                  {terms_of_service_accepted && (
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>✓</Text>
                  )}
                </TouchableOpacity>
                <Text>
                  I accept{" "}
                  <Text
                    style={[styles.link, { textDecorationLine: "underline" }]}
                    onPress={() =>
                      Platform.OS === "web"
                        ? window.open(tosLink, "_blank")
                        : Linking.openURL(tosLink)
                    }
                  >
                    terms of service
                  </Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  opacity:
                    isFormValid &&
                    privacy_policy_accepted &&
                    terms_of_service_accepted
                      ? 1
                      : 0.6,
                },
              ]}
              disabled={
                !isFormValid ||
                !privacy_policy_accepted ||
                !terms_of_service_accepted ||
                isLoading
              }
              onPress={handleSignup}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

export default Signup;

function createStyle(loginTheme, isSmallScreen) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 16 : 24,
      borderRadius: isSmallScreen ? 0 : 20,
      overflow: "hidden",
      backgroundColor: LoginColors[loginTheme].backgroundCard,
      width: isSmallScreen ? "100%" : "auto",
      minWidth: isSmallScreen ? "100%" : 600,
      maxWidth: isSmallScreen ? "100%" : 800,
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
    },
    cardContent: {
      width: "100%",
      justifyContent: "center",
      alignContent: "center",
      alignItems: "center",
    },
    logo: {
      alignSelf: "center",
      height: 150,
      width: 150,
      marginBottom: 20,
    },
    title: {
      fontSize: 42,
      fontWeight: "600",
      color: LoginColors[loginTheme].title,
      textAlign: "center",
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      textAlign: "center",
      marginBottom: 40,
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    formWrapper: {
      width: "100%",
      maxWidth: 700,
      alignItems: "center",
    },
    gridContainer: {
      width: "100%",
      flexDirection: isSmallScreen ? "column" : "row",
      flexWrap: isSmallScreen ? "nowrap" : "wrap",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    inputGroup: {
      marginBottom: 20,
      width: isSmallScreen ? "100%" : "48%",
      minWidth: isSmallScreen ? "100%" : 280,
    },
    label: {
      fontSize: 14,
      color: LoginColors[loginTheme].subtitle,
      marginBottom: 8,
      fontWeight: "500",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 6,
      backgroundColor: "white",
      borderColor: LoginColors[loginTheme].borderTextInput,
      borderWidth: 1.5,
      minHeight: 44,
    },
    inputError: {
      borderColor: "rgba(255, 99, 99, 0.8)",
      backgroundColor: "rgba(255, 99, 99, 0.1)",
    },
    inputSuccess: {
      // New style for success
      borderColor: "rgba(0, 128, 0, 0.8)", // Green color
      backgroundColor: "rgba(0, 128, 0, 0.1)", // Light green background
    },
    textInput: {
      flex: 1,
      padding: 10,
      fontSize: 16,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none",
    },
    eyeButton: {
      width: 40,
      height: 44,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 4,
    },
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 6,
      width: isSmallScreen ? "100%" : 300,
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
      marginTop: 20,
    },
    submitButtonText: {
      fontSize: 16,
      color: "white",
      fontWeight: "500",
    },
    handleErrorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 12,
      marginTop: 4,
    },
    errorText: {
      color: "rgba(255, 99, 99, 0.9)",
      fontSize: 14,
      marginTop: 16,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    link: {
      color: LoginColors[loginTheme].link,
    },
  });
}
