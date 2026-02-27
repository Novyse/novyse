import React, { useContext } from "react";
import { StyleSheet, Platform, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import EmojiSelector from "react-native-emoji-selector";
import BlurredView from "@/src/components/BlurredView";

interface EmojiPickerProps {
  onEmojiSelected: (emoji: string) => void;
  onClose?: () => void;
}

const EmojiPicker = ({ onEmojiSelected, onClose }: EmojiPickerProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleEmojiSelected = (emoji: string): void => {
    onEmojiSelected(emoji);
    if (onClose) onClose();
  };

  const isWeb = Platform.OS === "web";

  return (
    <BlurredView style={styles.container}>
      <View style={styles.emojiSelector}>
        <EmojiSelector
          onEmojiSelected={handleEmojiSelected}
          showSearchBar={true}
          showSectionTitles={false}
          showTabs={true}
          showHistory={false}
          columns={isWeb ? 8 : 6}
          placeholder="Search emoji..."
        />
      </View>
    </BlurredView>
  );
};

const createStyle = (theme: any) =>
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