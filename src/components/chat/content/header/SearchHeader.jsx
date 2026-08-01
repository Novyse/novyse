import React, { useContext, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";

import Icon from "@/src/components/Icon";
import { HEADER_ROW_HEIGHT, ICON_BUTTON_SIZE } from "@/src/components/header/constants";

import { ThemeContext } from "@/src/context/ThemeContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import database from "@/src/utils/storage/database";

const SearchHeader = ({ onClose }) => {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const selectedChatUUID = useActiveChatStore(
    (state) => state.selectedChatUUID,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const setSelectedSub = useActiveChatStore((state) => state.setSelectedSub);
  const setScrollToMessageID = useActiveChatStore(
    (state) => state.setScrollToMessageID,
  );
  const setMessageHighlight = useActiveChatStore(
    (state) => state.setMessageHighlight,
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  // Clear the static text highlight when leaving search mode.
  useEffect(() => {
    return () => setMessageHighlight(null);
  }, [setMessageHighlight]);

  const jumpTo = (index, list, term) => {
    const target = list[index];
    if (!target || !selectedChatUUID) return;

    const subID = target.subID ?? selectedSub ?? 0;
    const content = String(target.content || "")
      .trimStart()
      .replace(/(^|\s)@(\w+)/g, "$1[@$2](/profile/$2)");
    const i = term ? content.toLowerCase().indexOf(term.toLowerCase()) : -1;

    if (i >= 0) {
      setMessageHighlight({
        chatUUID: selectedChatUUID,
        subID,
        messageID: target.id,
        rangeStart: i,
        rangeEnd: i + term.length,
      });
    } else {
      setMessageHighlight(null);
    }

    if ((selectedSub ?? 0) !== subID) setSelectedSub(subID);
    setScrollToMessageID(String(target.id));
  };

  const runSearch = (text) => {
    const trimmed = text.trim();
    if (trimmed.length < 1 || !selectedChatUUID) {
      setResults([]);
      setCurrentIndex(0);
      setLoading(false);
      setMessageHighlight(null);
      return;
    }

    setLoading(true);
    database.message
      .search(trimmed, {
        chatUUID: selectedChatUUID,
        subID: selectedSub ?? 0,
        limit: 500,
      })
      .then((rows) => {
        setResults(rows);
        setCurrentIndex(0);
        setLoading(false);
        if (rows.length > 0) jumpTo(0, rows, trimmed);
        else setMessageHighlight(null);
      })
      .catch(() => {
        setResults([]);
        setLoading(false);
        setMessageHighlight(null);
      });
  };

  const handleChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Results are newest-first. Arrow down -> newer (lower index), arrow up -> older (higher index).
  const goNewer = () => {
    if (results.length === 0) return;
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    jumpTo(next, results, query.trim());
  };

  const goOlder = () => {
    if (results.length === 0) return;
    const next = Math.min(results.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    jumpTo(next, results, query.trim());
  };

  const handleClose = () => {
    setMessageHighlight(null);
    onClose();
  };

  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <View style={styles.headerMainRow}>
      <View style={styles.headerLeft}>
        <Icon
          name="Search01Icon"
          color={theme.placeholderText}
          onPress={() => {}}
          style={styles.iconButton}
        />
        <TextInput
          ref={inputRef}
          placeholder={t("chat.header.search.placeholder")}
          placeholderTextColor={theme.placeholderText}
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          returnKeyType="search"
          onSubmitEditing={goOlder}
        />
      </View>

      <View style={styles.headerRight}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={theme.icon}
            style={styles.counter}
          />
        ) : hasQuery ? (
          <AppText
            style={styles.counter}
            text={hasResults ? `${currentIndex + 1}/${results.length}` : "0/0"}
          />
        ) : null}
        <Icon
          name="ArrowUp01Icon"
          onPress={goOlder}
          color={hasResults ? theme.icon : theme.placeholderText}
          style={styles.iconButton}
        />
        <Icon
          name="ArrowDown01Icon"
          onPress={goNewer}
          color={hasResults ? theme.icon : theme.placeholderText}
          style={styles.iconButton}
        />
        <Icon
          name="Cancel01Icon"
          onPress={handleClose}
          style={styles.iconButton}
        />
      </View>
    </View>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: HEADER_ROW_HEIGHT,
      width: "100%",
    },
    headerLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    input: {
      marginLeft: 5,
      flex: 1,
      fontSize: 16,
      color: theme.text,
      outlineStyle: "none",
    },
    counter: {
      fontSize: 13,
      color: theme.placeholderText,
      minWidth: 34,
      textAlign: "center",
    },
    iconButton: {
      width: ICON_BUTTON_SIZE,
      height: ICON_BUTTON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

export default SearchHeader;
