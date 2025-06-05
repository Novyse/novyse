import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  BackHandler,
  ActivityIndicator,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import JsonParser from "./utils/JsonParser";
import eventEmitter from "./utils/EventEmitter";

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
      router.navigate("/messages");
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
    // Pulisce il timer precedente se esiste
    if (timer) clearTimeout(timer);
    setTimer(null); // Resetta lo stato del timer

    const trimmedValue = value.trim();

    // Se il valore (dopo il trim) è vuoto, resetta lo stato e non fare la chiamata API
    if (trimmedValue === "") {
      setIsLoading(false);
      setResponseArray([]);
      // Non impostare un nuovo timer e non eseguire la chiamata API
      return;
    }

    // Se il valore non è vuoto, mostra l'indicatore di caricamento
    // e pianifica la chiamata API dopo un ritardo (debounce)
    setIsLoading(true);
    setResponseArray([]); // Pulisce i risultati precedenti mentre si caricano i nuovi

    const timerOnChange = setTimeout(async () => {
      try {
        // Usa trimmedValue per la ricerca
        const searched_list = await JsonParser.searchAll(trimmedValue);
        setResponseArray(searched_list || []);
        console.log("Lista ricerca:", searched_list);
      } catch (error) {
        console.error("Errore nella ricerca:", error);
        setResponseArray([]); // Svuota i risultati in caso di errore
      } finally {
        // Nasconde l'indicatore di caricamento alla fine, sia in caso di successo che di errore
        setIsLoading(false);
      }
    }, 500); // Ritardo di 500ms (debounce)

    // Salva il riferimento al nuovo timer
    setTimer(timerOnChange);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        // Emit event with handle and close search
        eventEmitter.emit("searchResultSelected", {
          handle: item.handle,
          type: item.type,
        });
        router.setParams({ chatId: undefined, creatingChatWith: item.handle });
      }}
    >
      <Image
        source={{ uri: "https://picsum.photos/200" }}
        style={styles.avatar}
      />
      <Text style={styles.resultText}>{item.handle}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={theme.searchSideBarGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <TextInput
        placeholder="Search"
        placeholderTextColor="gray"
        style={styles.searchBar}
        onChangeText={handleChange}
      />
      {isLoading && (
        <ActivityIndicator
          size="large"
          color={theme.icon}
          style={styles.loader}
        />
      )}
      {responseArray.length > 0 && (
        <FlatList
          data={responseArray}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.results}
        />
      )}
    </LinearGradient>
  );
};

export default Search;

function createStyle(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      paddingTop: 0,
    },
    searchBar: {
      flex: 1,
      backgroundColor: theme.backgroundChatTextInput,
      borderRadius: 15,
      padding: 8,
      fontSize: 18,
      minWidth: 20,
      color: theme.text,
      placeholderTextColor: "#bfbfbf",
      outlineStyle: "none",
      maxHeight: 45,
    },
    loader: {
      marginTop: 20,
    },
    results: {
      marginTop: 10,
      flex: 1,
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      backgroundColor: theme.backgroundChatInsideList,
      borderRadius: 13,
      marginBottom: 10,
    },
    resultText: {
      fontSize: 16,
      color: theme.text,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
  });
}
