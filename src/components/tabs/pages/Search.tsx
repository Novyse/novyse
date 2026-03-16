import React, { useState, useContext, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeContext } from "@/context/ThemeContext";
import { ChatContext } from "@/context/ActiveChatContext";

import gateway from "@/src/utils/backend-services/api-gateway";
import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import ItemSearch from "@/src/components/chat/list/ItemSearch";

import { tabNavigator } from "@/src/utils/navigation/tabRef";

interface SearchResult {
  handle: string;
  name: string;
  surname?: string;
  type?: string;
  memberCount?: number;
}

const Search = () => {
  const { theme } = useThemeContext();
  const { setSelectedHandle } = useContext(ChatContext);
  const intets = useSafeAreaInsets();
  const styles = createStyle(theme, intets);

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

  const renderItem = ({ item }: { item: SearchResult }) => (
    <ItemSearch
      item={item}
      onPress={(handle) => {
        setSelectedHandle(handle);
      }}
    />
  );

  return (
    <>
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
            tabNavigator.navigate("ChatList");
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
          contentContainerStyle={styles.flatListContent}
          keyExtractor={(item, index) => index.toString()}
          style={styles.results}
        />
      )}
      {isSearching && !isLoading && responseArray.length === 0 && (
        <Text style={styles.noResults}>No results found</Text>
      )}
    </>
  );
};

export default Search;

const createStyle = (theme: any, insets: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
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
      outlineStyle: "none" as any,
    },
    loader: {
      marginTop: 90 + insets.top,
    },
    results: {
      paddingTop: 75 + insets.top,
      flex: 1,
      ...(Platform.OS === "web" && {
        // Standard for Firefox (fixed, no active/drag change)
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.scrollbar} ${theme.backgroundScrollbar}`,

        "::WebkitScrollbar": {
          width: 6,
          backgroundColor: theme.backgroundScrollbar,
        },
        "::WebkitScrollbarTrack": {
          backgroundColor: theme.backgroundScrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb": {
          backgroundColor: theme.scrollbar,
          borderRadius: 3,
        },
        "::WebkitScrollbarThumb:hover": {
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
    flatListContent: { padding: 10, gap: 10 },
  });
};
