import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import BlurredView from "@/src/components/BlurredView";
import EmojiPicker from "./EmojiPicker";

import AppText from "@/src/components/AppText";

const TABS = {
  EMOJI: "emoji",
  STICKER: "sticker",
  GIF: "gif",
} as const;

type TabValue = (typeof TABS)[keyof typeof TABS];

interface Anchor {
  height?: number;
}

interface ChatIconsPickerModalProps {
  visible: boolean;
  children?: React.ReactNode;
  anchor?: Anchor;
  onEmojiSelected: (emoji: string) => void;
}

const ChatIconsPickerModal = ({
  visible,
  children,
  anchor,
  onEmojiSelected,
}: ChatIconsPickerModalProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [activeTab, setActiveTab] = useState<TabValue>(TABS.EMOJI);

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case TABS.EMOJI:
        return (
          <EmojiPicker onEmojiSelected={onEmojiSelected} onClose={() => {}} />
        );
      case TABS.STICKER:
        return <AppText style={styles.contentText} text="2" />;
      case TABS.GIF:
        return <AppText style={styles.contentText} text="3" />;
      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <BlurredView
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
          <AppText
            style={[
              styles.tabText,
              activeTab === TABS.EMOJI && styles.activeTabText,
            ]}
            translationKey="chat.iconsPicker.emoji"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.STICKER && styles.activeTab]}
          onPress={() => setActiveTab(TABS.STICKER)}
        >
          <AppText
            style={[
              styles.tabText,
              activeTab === TABS.STICKER && styles.activeTabText,
            ]}
            translationKey="chat.iconsPicker.sticker"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.GIF && styles.activeTab]}
          onPress={() => setActiveTab(TABS.GIF)}
        >
          <AppText
            style={[
              styles.tabText,
              activeTab === TABS.GIF && styles.activeTabText,
            ]}
            translationKey="chat.iconsPicker.gif"
          />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.contentContainer}>{renderContent()}</ScrollView>
    </BlurredView>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      right: 10,
      backgroundColor: theme.backgroundMain,
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
      overflow: "hidden",
    },
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.ChatIconsPickerModalBorderColor,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: theme.primary,
    },
    tabText: {
      color: theme.ChatIconsPickerModalTabInactiveText,
      fontSize: 14,
      fontWeight: "500",
    },
    activeTabText: {
      color: theme.text,
    },
    contentContainer: {
      height: 450,
    },
    contentText: {
      color: theme.text,
      fontSize: 24,
    },
  });

export default ChatIconsPickerModal;
