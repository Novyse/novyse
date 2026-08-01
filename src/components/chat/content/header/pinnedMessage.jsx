import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";
import useChatStore from "@/src/context/ChatContext";
import { useActiveChatStore } from "@/src/context/ActiveChatContext";

import AppText from "@/src/components/AppText";
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
    pinnedMessage?.subID,
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

  const setScrollToMessageID = useActiveChatStore(
    (state) => state.setScrollToMessageID,
  );
  const selectedSub = useActiveChatStore((state) => state.selectedSub);
  const router = useRouter();

  const handlePress = () => {
    if (message) {
      if (
        pinnedMessage?.subID !== undefined &&
        pinnedMessage.subID !== selectedSub
      ) {
        router.push(
          `/app/chat/${pinnedMessage.chatUUID}/${pinnedMessage.subID}`,
        );
      }
      setScrollToMessageID(message.id);
    }
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

          <TouchableOpacity
            style={styles.pinnedTextContainer}
            onPress={handlePress}
          >
            <AppText
              style={styles.pinnedText}
              numberOfLines={1}
              text={message?.content}
            />
            {hasMultiple && (
              <AppText
                style={styles.indicatorText}
                text={`${currentIndex + 1} / ${pinnedMessages.length}`}
              />
            )}
          </TouchableOpacity>
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
  return StyleSheet.create({
    headerSecondaryRow: {
      width: "100%",
      paddingBottom: 8,
      justifyContent: "center",
    },
    pinnedContainer: {
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
  });
}

export default PinnedMessageHeader;
