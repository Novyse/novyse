import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";
import useChatStore from "@/context/ChatContext";

import Icon from "@/src/components/Icon";

const PinnedMessageHeader = ({ pinnedMessages }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [currentIndex, setCurrentIndex] = useState(pinnedMessages.length - 1);
  const [prevLength, setPrevLength] = useState(pinnedMessages.length);

  useEffect(() => {
    if (pinnedMessages.length > prevLength) {
      // New message pinned: jump to the latest one
      setCurrentIndex(pinnedMessages.length - 1);
    } else if (pinnedMessages.length < prevLength) {
      // Message unpinned: clamp the index or go to previous
      setCurrentIndex((prev) =>
        Math.max(0, Math.min(prev, pinnedMessages.length - 1)),
      );
    }
    setPrevLength(pinnedMessages.length);
  }, [pinnedMessages.length, prevLength]);

  const pinnedMessage = pinnedMessages[currentIndex];
  // retrieve the full message details using the custom useChatStore
  const chatStore = useChatStore();
  const message = chatStore.getMessage(
    pinnedMessage?.chatUUID,
    pinnedMessage?.messageID,
  );

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length,
    );
  };

  const hasMultiple = pinnedMessages.length > 1;

  return (
    <View style={styles.headerSecondaryRow}>
      <View style={styles.pinnedContainer}>
        <View style={styles.pinnedContentRow}>
          {hasMultiple && (
            <Icon
              name="ArrowLeft02Icon"
              size={18}
              onPress={handlePrev}
              style={styles.navIcon}
              disabled={!hasMultiple}
            />
          )}

          <View style={styles.pinnedTextContainer}>
            <Text style={styles.pinnedText} numberOfLines={1}>
              {message?.content}
            </Text>
            {hasMultiple && (
              <Text style={styles.indicatorText}>
                {currentIndex + 1} / {pinnedMessages.length}
              </Text>
            )}
          </View>
          {hasMultiple && (
            <Icon
              name="ArrowRight02Icon"
              size={18}
              onPress={handleNext}
              style={styles.navIcon}
              disabled={!hasMultiple}
            />
          )}
        </View>
      </View>
    </View>
  );
};

function createStyle(theme) {
  const HEADER_MAIN_HEIGHT = 55;
  const ICON_SIZE = 40;

  return StyleSheet.create({
    container: {
      flex: 1,
      overflow: "hidden",
    },
    contentWrapper: {
      flex: 1,
    },
    headerWrapper: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    headerBase: {
      overflow: "hidden",
    },
    headerColumnContainer: {
      flexDirection: "column",
      width: "100%",
      paddingBottom: 0,
    },
    headerMainRow: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_MAIN_HEIGHT,
      paddingHorizontal: 8,
      width: "100%",
    },
    headerLeft: {
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    headerCenter: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerRight: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    headerSecondaryRow: {
      width: "100%",
      paddingBottom: 8,
      justifyContent: "center",
    },
    pinnedContainer: {
      backgroundColor: "rgba(0,0,0,0.05)",
      padding: 6,
      borderRadius: 8,
      width: "100%",
    },
    pinnedContentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    pinnedTextContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 8,
    },
    pinnedText: {
      flex: 1,
      fontSize: 12,
      color: theme.text,
      opacity: 0.9,
    },
    indicatorText: {
      fontSize: 10,
      color: theme.text,
      opacity: 0.6,
      marginLeft: 8,
      fontVariant: ["tabular-nums"],
    },
    navIcon: {
      padding: 4,
    },
    voiceControlContainer: {
      height: 36,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.08)",
      borderRadius: 12,
    },
    iconButton: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      justifyContent: "center",
      alignItems: "center",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: theme.placeholder || "#ccc",
    },
    chatTitle: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "600",
      textAlign: "center",
      flexShrink: 1,
    },
    splitContainer: {
      flex: 1,
      flexDirection: "row",
    },
    splitPanel: {
      flex: 1,
      height: "100%",
    },
    splitSeparator: {
      width: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
      height: "100%",
    },
  });
}

export default PinnedMessageHeader;
