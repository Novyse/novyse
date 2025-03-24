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
      router.navigate("/ChatList");
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
        const searched_list = await JsonParser.searchAll(value);
        setResponseArray(searched_list || []);
        console.log("Lista ricerca:", searched_list);
      } catch (error) {
        console.error("Errore nella ricerca:", error);
        setResponseArray([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    setTimer(timerOnChange);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        // Emit event with handle and close search
        eventEmitter.emit("searchResultSelected", { handle: item });
        router.setParams({ chatId: undefined, creatingChatWith: item });
      }}
    >
      <Image
        source={{ uri: "https://picsum.photos/200" }}
        style={styles.avatar}
      />
      <Text style={styles.resultText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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

export default Search;
