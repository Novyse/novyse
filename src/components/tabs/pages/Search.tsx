import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  ActivityIndicator,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";
import { ScrollBar } from "@/constants/ScrollBar";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import gateway from "@/src/utils/backend-services/api-gateway";
import Icon from "@/src/components/Icon";
import BlurredHeader from "@/src/components/BlurredHeader";
import ItemSearch from "@/src/components/chat/list/ItemSearch";

import { tabNavigator } from "@/src/utils/navigation/tabRef";

interface SearchResult {
  handle: string;
  name: string;
  surname?: string;
  type: "USER" | "GROUP" | "FORUM" | "CHANNEL";
  profilePictureUUID?: string;
  memberCount?: number;
}

const Search = () => {
  const { t } = useTranslation();
  const { theme } = useThemeContext();
  const setSelectedHandle = useActiveChatStore(
    (state) => state.setSelectedHandle,
  );
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

        const { users = [], chats = []} = data;
        const searched_list: SearchResult[] = [
          ...users.map((user: any) => ({ ...user, type: "USER" as const })),
          ...chats.map((chat: any) => ({
            ...chat,
            type: (chat.type || "GROUP") as "GROUP" | "FORUM" | "CHANNEL",
          })),
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
          placeholder={t("tabs.search.search")}
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
        <FlashList
          data={responseArray}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
          keyExtractor={(item, index) => index.toString()}
          style={styles.results}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
      {isSearching && !isLoading && responseArray.length === 0 && (
        <AppText
          style={styles.noResults}
          translationKey="tabs.search.noResults"
        />
      )}
    </>
  );
};

export default Search;

const createStyle = (theme: any, insets: any) => {
  return StyleSheet.create({
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
      flex: 1,
      ...ScrollBar(theme),
    },
    noResults: {
      marginTop: 20,
      textAlign: "center",
      color: theme.text,
      fontSize: 16,
    },
    flatListContent: {
      padding: 10,
      paddingTop: 75 + insets.top + 10,
      paddingBottom: 10 + insets.bottom,
    },
  });
};
