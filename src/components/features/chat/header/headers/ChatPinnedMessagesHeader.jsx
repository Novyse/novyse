import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

import useChatStore from "@/src/store/ChatStore";
import { useActiveChatStore } from "@/src/store/ActiveChatStore";

import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import AppHeaderRow, {
  headerIconButtonStyle,
} from "@/src/components/features/header/AppHeaderRow";

const PinnedMessageHeader = ({ pinnedMessages }) => {
  const [currentIndex, setCurrentIndex] = useState(pinnedMessages.length - 1);
  const [prevLength, setPrevLength] = useState(pinnedMessages.length);

  useEffect(() => {
    if (pinnedMessages.length > prevLength) {
      setCurrentIndex(pinnedMessages.length - 1);
    } else if (pinnedMessages.length < prevLength) {
      setCurrentIndex((prev) =>
        Math.max(0, Math.min(prev, pinnedMessages.length - 1)),
      );
    }
    setPrevLength(pinnedMessages.length);
  }, [pinnedMessages.length, prevLength]);

  const pinnedMessage = pinnedMessages[currentIndex];
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
  const setContentView = useActiveChatStore((state) => state.setContentView);
  const contentView = useActiveChatStore((state) => state.contentView);
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
      if (contentView === "vocal") {
        setContentView("chat");
      }
      setScrollToMessageID(message.id);
    }
  };

  const hasMultiple = pinnedMessages.length > 1;

  return (
    <AppHeaderRow
      left={
        <View style={styles.leftContainer}>
          <Icon
            name="PinIcon"
            onPress={handlePress}
            style={headerIconButtonStyle.iconButton}
          />
          <Pressable onPress={handlePress} style={styles.leftPressable}>
            <Typography
              weight="semibold"
              numberOfLines={1}
              text={message?.content}
            />
            {hasMultiple && (
              <Typography
                size="xs"
                variant="subtitle"
                text={`${currentIndex + 1} / ${pinnedMessages.length}`}
              />
            )}
          </Pressable>
        </View>
      }
      right={
        hasMultiple ? (
          <>
            <Icon
              name="ArrowLeft02Icon"
              onPress={handlePrev}
              style={headerIconButtonStyle.iconButton}
            />
            <Icon
              name="ArrowRight02Icon"
              onPress={handleNext}
              style={headerIconButtonStyle.iconButton}
            />
          </>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  leftContainer: {
    gap: 5,
    flexDirection: "row",
  },
  leftPressable: {
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
    width: "100%",
  },
});

export default PinnedMessageHeader;
