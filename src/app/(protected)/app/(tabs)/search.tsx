import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import SmartBackground from "@/src/components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import gateway from "@/src/utils/backend-services/api-gateway";
import eventEmitter from "@/src/utils/global/Events/lib/EventEmitter";
import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";

import { detailsNavigator } from "@/src/utils/navigation/ref";

interface SearchResult {
  handle: string;
  name: string;
  surname?: string;
  type?: string;
  memberCount?: number;
}

const Search = () => {
  const theme = (useContext(ThemeContext) as any).theme;
  const styles = createStyle(theme);
  const router = useRouter();

  const [responseArray, setResponseArray] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [timer, setTimer] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  const handleChange = (value: string) => {
    // Clear the previous timer if it exists
    if (timer) clearTimeout(timer);
    setTimer(null); // Reset the timer state

    const trimmedValue = value.trim();

    // If the value (after trim) is empty or has less than 3 characters, reset the state and do not make the API call
    if (trimmedValue === "" || trimmedValue.length < 3) {
      setIsLoading(false);
      setResponseArray([]);
      setIsSearching(false);
      // Do not set a new timer and do not execute the API call
      return;
    }

    // If the value is not empty, show the loading indicator
    // and schedule the API call after a delay (debounce)
    setIsLoading(true);
    setResponseArray([]); // Clear previous results while loading new ones
    setIsSearching(true);

    const timerOnChange = setTimeout(async () => {
      try {
        // Use trimmedValue for the search
        const result = (await gateway.search.all(trimmedValue)) as {
          success: boolean;
          data: any;
        };
        const { success, data } = result;
        if (!success) throw new Error("Search API call failed");

        const { users = [], chats = [], bots = [] } = data;
        const searched_list: SearchResult[] = [
          ...users.map((user: any) => ({ ...user, type: "USER" })),
          ...chats.map((chat: any) => ({ ...chat })),
          ...bots.map((bot: any) => ({ ...bot, type: "BOT" })),
        ];

        setResponseArray(searched_list || []);
        console.log("Search list:", searched_list);
      } catch (error) {
        console.error("Error in search:", error);
        setResponseArray([]); // Clear results in case of error
      } finally {
        // Hide the loading indicator at the end, both in success and error cases
        setIsLoading(false);
      }
    }, 500); // Delay of 500ms (debounce)

    // Save the reference to the new timer
    setTimer(timerOnChange);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: SearchResult;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        // Emit event with handle and close search
        eventEmitter.emit("searchResultSelected", {
          handle: item.handle,
          type: item.type,
        });
        detailsNavigator.navigate("chat", { chatUUIDorHandle: item.handle });
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
      colors={theme.backgroundSearchGradient}
      style={styles.container}
    >
      <BlurredHeader style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
        <Icon
          name="Search01Icon"
          size={20}
          color={theme.placeholderText}
          hoverColor={theme.iconHover}
          onPress={() => {}}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search"
          placeholderTextColor={theme.placeholderText}
          style={styles.searchBar}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            handleChange(text);
          }}
        />
        <Icon
          name="Cancel01Icon"
          size={20}
          color={theme.placeholderText}
          hoverColor={theme.iconHover}
          onPress={() => {
            router.back();
            setSearchText("");
            handleChange("");
          }}
          style={styles.closeIcon}
        />
      </BlurredHeader>
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

const createStyle = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      paddingTop: 0,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      borderRadius: 99,
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      marginTop: 10,
    },
    searchIcon: {
      marginRight: 10,
    },
    closeIcon: {
      marginLeft: 10,
    },
    searchBar: {
      flex: 1,
      fontSize: 16,
      marginLeft: 5,
      color: theme.text,
      // @ts-ignore
      outlineStyle: "none",
    },
    loader: {
      marginTop: 20,
    },
    results: {
      marginTop: 10,
      flex: 1,
      ...(Platform.OS === "web" && {
        // Standard for Firefox (fixed, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::-webkit-scrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::-webkit-scrollbar-track": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          backgroundColor: theme.scrollbarHover,
        },
      }),
    },
    resultItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      backgroundColor: theme.backgroundSearchResultItem,
      borderRadius: 13,
      marginBottom: 10,
    },
    resultText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: "500",
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
    },
    noResults: {
      marginTop: 20,
      textAlign: "center",
      color: theme.text,
      fontSize: 16,
    },
    textContainer: {
      flexDirection: "column",
      flex: 1,
    },
    profileHandle: {
      color: theme.placeholderText,
      fontSize: 14,
      marginTop: 2,
    },
  });
};
