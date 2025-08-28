import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import EmojiPicker from "./EmojiPicker"; // Verify this path

const TABS = {
  EMOJI: "emoji",
  STICKER: "sticker",
  GIF: "gif",
};

const ChatIconsPickerModal = ({
  visible,
  children,
  anchor,
  onEmojiSelected,
}) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [activeTab, setActiveTab] = useState(TABS.EMOJI);

  const renderContent = () => {
    switch (activeTab) {
      case TABS.EMOJI:
        return (
          <EmojiPicker onEmojiSelected={onEmojiSelected} onClose={() => {}} />
        );
      case TABS.STICKER:
        return <Text style={styles.contentText}>2</Text>;
      case TABS.GIF:
        return <Text style={styles.contentText}>3</Text>;
      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          bottom: anchor?.height ? anchor.height + 10 : 80,
        },
      ]}
    >
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.EMOJI && styles.activeTab]}
          onPress={() => setActiveTab(TABS.EMOJI)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === TABS.EMOJI && styles.activeTabText,
            ]}
          >
            Emoji
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.STICKER && styles.activeTab]}
          onPress={() => setActiveTab(TABS.STICKER)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === TABS.STICKER && styles.activeTabText,
            ]}
          >
            Sticker
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.GIF && styles.activeTab]}
          onPress={() => setActiveTab(TABS.GIF)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === TABS.GIF && styles.activeTabText,
            ]}
          >
            GIF
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.contentContainer}>{renderContent()}</ScrollView>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      right: 10,
      backgroundColor: theme.modalBackground || "#1e1e1e",
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      minHeight: 100,
      maxHeight: 500,
      minWidth: 300,
      width: "23%",
      overflow: "hidden"
    },
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.ChatIconsPickerModalBorderColor || "#333",
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: theme.primary || "#4f8cff",
    },
    tabText: {
      color: theme.ChatIconsPickerModalTabInactiveText || "#999",
      fontSize: 14,
      fontWeight: "500",
    },
    activeTabText: {
      color: theme.text || "#ffffffff",
    },
    contentContainer: {
      height: 450,
    },
    contentText: {
      color: theme.text || "#ffffffff",
      fontSize: 24,
    },
  });

export default ChatIconsPickerModal;
