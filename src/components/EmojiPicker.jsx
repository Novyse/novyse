import React, { useContext } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import EmojiSelector from "react-native-emoji-selector";
import BlurredView from "@/src/components/BlurredView";

const EmojiPicker = ({ onEmojiSelected, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleEmojiSelected = (emoji) => {
    onEmojiSelected(emoji);
    if (onClose) onClose();
  };

  const isWeb = Platform.OS === "web";

  return (
    <BlurredView style={styles.container}>
      <EmojiSelector
        onEmojiSelected={handleEmojiSelected}
        showSearchBar={true}
        showSectionTitles={false}
        showTabs={true}
        showHistory={false}
        columns={isWeb ? 8 : 6}
        placeholder="Search emoji..."
        style={styles.emojiSelector}
      />
    </BlurredView>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
      height: "100%",
      borderRadius: 0,
    },
    emojiSelector: {
      flex: 1,
    },
  });

export default EmojiPicker;
