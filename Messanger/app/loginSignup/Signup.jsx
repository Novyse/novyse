import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler
} from "react-native";
import JsonParser from "../utils/JsonParser";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// const Signup = ({ route, navigation }) => {
//   const { emailValue } = route.params; // Assume navigation passes the emailValue
//   return (
//     <View style={styles.container}>
//       <SignupForm emailValue={emailValue} navigation={navigation} />
//     </View>
//   );
// };

const Signup = () => {
  const { emailValue } = useLocalSearchParams();
  const router = useRouter();

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);

  const [form, setForm] = useState({
    password: "",
    confirmpassword: "",            //non cambiare questo nome di "confirmpassword", per il modo in cui è fatto il form
    name: "",
    surname: "",
    handle: "",
  });

  useEffect(() => {
    const checkLogged = async () => {
      const storeGetIsLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (storeGetIsLoggedIn == "true") {
        router.push("/ChatList");
      } else {
        console.log("Utente non loggato");
      }
    };
    checkLogged().then(() => {
      console.log("CheckLogged completed");
    });


    const backAction = () => {
      router.push("/loginSignup/EmailCheckForm");
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
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
      router.push("/loginSignup/EmailCheckForm");
    } else {
      console.log("Signup Failed", "Please try again.");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
          {["Password", "Confirm Password", "Name", "Surname", "Handle"].map(
            (label, index) => (
              <View key={index} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    label === "Handle" && handleAvailable == false ? styles.handleInputError : null, // Conditional styling
                  ]}
                  secureTextEntry={label.toLowerCase().includes("password")}
                  onChangeText={(text) =>
                    handleChange(label.toLowerCase().replace(" ", ""), text)
                  }
                  placeholder={label}
                  placeholderTextColor="#ccc"
                />
                { label === "Handle" && handleAvailable == false ? <Text style={styles.handleTextError}>Handle già in utilizzo</Text> : null}
              </View>
            )
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

const styles = StyleSheet.create({});

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#354966",
      justifyContent: "center",
      alignItems: "center",
    },
    formContainer: {
      justifyContent: "center",
      alignItems: "center",
    },
    inputGroup: {
      marginVertical: 10,
      width: "80%",
    },
    label: {
      color: "#ffffff",
      fontSize: 16,
      marginBottom: 5,
    },
    input: {
      borderBottomWidth: 1,
      borderBottomColor: "#ffffff",
      color: "#ffffff",
      padding: 5,
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
