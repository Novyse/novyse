import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Importa o definisci JsonParser
import JsonParser from "./utils/JsonParser";

const Search = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const [responseArray, setResponseArray] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    const checkLogged = async () => {
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
      if (isLoggedIn !== "true") {
        router.navigate("/loginSignup/EmailCheckForm");
      }
    };
    checkLogged();

    const backAction = () => {
      router.navigate("/ChatList"); // Modificato da EmailCheckForm
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      backHandler.remove();
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  const handleChange = (value) => {
    setIsLoading(true);
    setResponseArray([]);
    if (timer) clearTimeout(timer);

    const timerOnChange = setTimeout(async () => {
      try {
        // Assicurati che JsonParser.searchAll sia definito
        const searched_list = await JsonParser.searchAll(value);
        setResponseArray(searched_list || []);
        console.log("Lista ricerca:", searched_list);
      } catch (error) {
        console.error("Errore nella ricerca:", error);
        setResponseArray([]);
      } finally {
        setIsLoading(false);
      }
    }, 3000);

    setTimer(timerOnChange);
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search"
        style={styles.searchBar}
        onChangeText={handleChange}
      />
      {isLoading && (
        <ActivityIndicator size="large" color={theme.icon} style={styles.loader} />
      )}
      {responseArray.length > 0 && (
        <View style={styles.results}>
          {responseArray.map((item, index) => (
            <Text key={index}>{item}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
      paddingTop: 0,
    },
    searchBar: {
      backgroundColor: "white",
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
    },
    loader: {
      marginTop: 20,
    },
    results: {
      marginTop: 10,
    },
  });

export default Search;