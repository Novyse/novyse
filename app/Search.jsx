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
import SmartBackground from "./components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import gateway from "./utils/backend-services/api-gateway";
import eventEmitter from "./utils/EventEmitter";

const Search = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  const [responseArray, setResponseArray] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    const backAction = () => {
      router.navigate("/chat");
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
      setIsSearching(false);
      // Non impostare un nuovo timer e non eseguire la chiamata API
      return;
    }

    // Se il valore non è vuoto, mostra l'indicatore di caricamento
    // e pianifica la chiamata API dopo un ritardo (debounce)
    setIsLoading(true);
    setResponseArray([]); // Pulisce i risultati precedenti mentre si caricano i nuovi
    setIsSearching(true);

    const timerOnChange = setTimeout(async () => {
      try {
        // Usa trimmedValue per la ricerca
        const { success, data } = await gateway.search.all(trimmedValue);
        if (!success) throw new Error("Search API call failed");

        const { users = [], chats = [], bots = [] } = data;
        const searched_list = [
          ...users.map((user) => ({ ...user, type: "USER" })),
          ...chats.map((chat) => ({ ...chat })),
          ...bots.map((bot) => ({ ...bot, type: "BOT" })),
        ];

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
        router.navigate(`/chat/${item.handle}`);
      }}
    >
      <Image
        source={{ uri: "https://picsum.photos/200" }}
        style={styles.avatar}
      />
      <View style={styles.textContainer}>
        <Text style={styles.resultText}>
          {item.name} {item?.surname ? `${item?.surname}` : null}
        </Text>
        <Text style={styles.profileHandle}>
          {item?.handle ? `@${item.handle}` : ""}
          {item.type === "GROUP" ||
          item.type === "FORUM" ||
          item.type === "CHANNEL"
            ? ` • ${item.memberCount} ${item.memberCount === 1 ? "member" : "members"}`
            : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SmartBackground
      colors={theme.searchSideBarGradient}
      style={styles.container}
    >
      <TextInput
        placeholder="Search"
        placeholderTextColor={theme.placeholderText}
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
      {isSearching && !isLoading && responseArray.length === 0 && (
        <Text style={styles.noResults}>No results found</Text>
      )}
    </SmartBackground>
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
    noResults: {
      marginTop: 20,
      textAlign: "center",
      color: theme.text,
    },
    textContainer: {
      flexDirection: "column",
    },
    profileHandle: {
      color: theme.placeholderText,
      fontSize: 14,
    },
  });
}
