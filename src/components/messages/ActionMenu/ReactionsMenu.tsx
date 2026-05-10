import React from "react";
import { StyleSheet, ScrollView, Platform } from "react-native";
import AppText from "@/src/components/AppText";
import HoverAndPressedButton from "../../HoverAndPressedButton";
import BlurredView from "../../BlurredView";
import { useThemeContext } from "@/src/context/ThemeContext";

interface ReactionMenuProps {
  onReaction: (emoji: string) => void;
}

const REACTIONS = ["😂", "👍", "👎", "😭", "🐄", "🤡"];

const ReactionMenu: React.FC<ReactionMenuProps> = ({ onReaction }) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);
  const isWeb = Platform.OS === "web";

  return (
    <BlurredView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={isWeb}
        contentContainerStyle={[
          styles.reactionRow,
          isWeb && styles.reactionRowWeb,
        ]}
        bounces={false}
        style={styles.scrollView}
      >
        {REACTIONS.map((emoji) => (
          <HoverAndPressedButton
            key={emoji}
            style={styles.reactionButton}
            onPress={() => onReaction(emoji)}
          >
            <AppText style={styles.reactionText} text={emoji} />
          </HoverAndPressedButton>
        ))}
      </ScrollView>
    </BlurredView>
  );
};

export default ReactionMenu;

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 10,
      paddingHorizontal: 4,
      paddingVertical: 4,
      marginBottom: 8,
      alignSelf: "flex-start",
      maxWidth: 175,
    },
    scrollView: {
      flexGrow: 0,
      flexShrink: 1,
    },
    reactionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    reactionRowWeb: {
      paddingBottom: 10,
    },
    reactionButton: {
      padding: 4,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
    },
    reactionText: {
      fontSize: 20,
      lineHeight: 26,
      color: theme.text,
    },
  });
