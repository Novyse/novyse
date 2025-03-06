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
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"; // Importa le icone

const Signup = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions(); // Ottieni la larghezza dello schermo

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [form, setForm] = useState({
    password: "",
    confirmpassword: "", // Non cambiare questo nome, per il modo in cui è fatto il form
    name: "",
    surname: "",
    handle: "",
  });

  // Stato per gestire la visibilità della password (true = nascosta, false = visibile)
  const [showPassword, setShowPassword] = useState({
    password: true,
    confirmpassword: true,
  });

  useEffect(() => {
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn == "true") {
        router.navigate("/messages");
      } else {
        console.log("Utente non loggato");
      }
    };
    checkLogged().then(() => {
      console.log("CheckLogged completed");
    });

    const backAction = () => {
      router.navigate("/loginSignup/EmailCheckForm");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  const [handleAvailable, setHandleAvailable] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [handleTimer, setHandleTimer] = useState(null);

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

    console.log("Password: ", password);
    console.log("Confirm Password: ", confirmpassword);

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

    const { password, confirmpassword, name, surname, handle } = form;

    const signupResponse = await JsonParser.signupJson(
      emailValue,
      name,
      surname,
      handle,
      password,
      confirmpassword
    );

    console.log("Signup avvenuto con successo");

    if (signupResponse) {
      router.navigate("/loginSignup/EmailCheckForm");
    } else {
      console.log("Signup Failed", "Please try again.");
    }
  };

  const isLargeScreen = width > 600; // Soglia per considerare uno schermo "grande" (es. tablet)

  return (
    <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.formContainer}>
            {isLargeScreen ? (
              // Layout a griglia (2 colonne) per schermi grandi
              <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                  <View style={styles.gridColumn}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          secureTextEntry={showPassword.password}
                          onChangeText={(text) => handleChange("password", text)}
                          placeholder="Password"
                          placeholderTextColor="#ccc"
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => toggleShowPassword("password")}
                        >
                          <MaterialCommunityIcons
                            name={
                              showPassword.password ? "eye-outline" : "eye-off-outline"
                            }
                            size={24}
                            color="white"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Name</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          onChangeText={(text) => handleChange("name", text)}
                          placeholder="Name"
                          placeholderTextColor="#ccc"
                        />
                      </View>
                    </View>
                    {/* Centra verticalmente il campo Handle */}
                    <View style={[styles.inputGroup, styles.centeredHandle]}>
                      <Text style={styles.label}>Handle</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[
                            styles.input,
                            handleAvailable == false ? styles.handleInputError : null,
                          ]}
                          onChangeText={(text) => handleChange("handle", text)}
                          placeholder="Handle"
                          placeholderTextColor="#ccc"
                        />
                      </View>
                      {handleAvailable == false && (
                        <Text style={styles.handleTextError}>
                          Handle già in utilizzo
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.gridColumn}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          secureTextEntry={showPassword.confirmpassword}
                          onChangeText={(text) =>
                            handleChange("confirmpassword", text)
                          }
                          placeholder="Confirm Password"
                          placeholderTextColor="#ccc"
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => toggleShowPassword("confirmpassword")}
                        >
                          <MaterialCommunityIcons
                            name={
                              showPassword.confirmpassword
                                ? "eye-outline"
                                : "eye-off-outline"
                            }
                            size={24}
                            color="white"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Surname</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.input}
                          onChangeText={(text) => handleChange("surname", text)}
                          placeholder="Surname"
                          placeholderTextColor="#ccc"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              // Layout a colonna singola per schermi piccoli
              <View>
                {["Password", "Confirm Password", "Name", "Surname", "Handle"].map(
                  (label, index) => (
                    <View key={index} style={styles.inputGroup}>
                      <Text style={styles.label}>{label}</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={[
                            styles.input,
                            label === "Handle" && handleAvailable == false
                              ? styles.handleInputError
                              : null,
                          ]}
                          secureTextEntry={
                            label.toLowerCase().includes("password") &&
                            showPassword[label.toLowerCase().replace(" ", "")]
                          }
                          onChangeText={(text) =>
                            handleChange(
                              label.toLowerCase().replace(" ", ""),
                              text
                            )
                          }
                          placeholder={label}
                          placeholderTextColor="#ccc"
                        />
                        {label.toLowerCase().includes("password") && (
                          <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() =>
                              toggleShowPassword(
                                label.toLowerCase().replace(" ", "")
                              )
                            }
                          >
                            <MaterialCommunityIcons
                              name={
                                showPassword[
                                  label.toLowerCase().replace(" ", "")
                                ]
                                  ? "eye-outline"
                                  : "eye-off-outline"
                              }
                              size={24}
                              color="white"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      {label === "Handle" && handleAvailable == false ? (
                        <Text style={styles.handleTextError}>
                          Handle già in utilizzo
                        </Text>
                      ) : null}
                    </View>
                  )
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: handleAvailable ? "#2399C3" : "#999" },
              ]}
              disabled={!handleAvailable}
              onPress={handleSignup}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
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

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.backgroundClassic,
    },
    formContainer: {
      justifyContent: "center",
      alignItems: "center",
      width: "90%", // Larghezza massima per il contenitore
      paddingHorizontal: 20, // Padding laterale per controllare la larghezza totale
    },
    gridContainer: {
      flexDirection: "column",
      width: "100%",
    },
    gridRow: {
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
    },
    gridColumn: {
      flex: 1,
      maxWidth: 300, // Limita la larghezza massima di ogni colonna per schermi grandi
      marginHorizontal: 10, // Maggiore spazio tra le colonne
    },
    inputGroup: {
      marginVertical: 10,
    },
    centeredHandle: {
      flex: 1,
      justifyContent: "center", // Centra verticalmente il campo Handle nella colonna
    },
    label: {
      color: "#ffffff",
      fontSize: 16,
      marginBottom: 5,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#ffffff",
      marginBottom: 16,
      width: "100%", // Larghezza piena per ogni campo nella griglia, limitata dal maxWidth della colonna
    },
    input: {
      outlineStyle: "none",
      flex: 1,
      color: "#ffffff",
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    eyeIcon: {
      padding: 10,
    },
    button: {
      marginTop: 20,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
    },
    handleInputError: {
      borderBottomColor: "red",
    },
    handleTextError: {
      color: "red",
      marginBottom: 8,
    },
  });
}