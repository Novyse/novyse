import React from "react";
import { View, StyleSheet, Text } from "react-native";
import HoverAndPressedButton from "../../HoverAndPressedButton";
import BlurredView from "../../BlurredView";
import { useThemeContext } from "@/context/ThemeContext";

interface ReactionMenuProps {
  onReaction: (emoji: string) => void;
}

const REACTIONS = ["😂", "👍", "👎", "😭", "🐄", "🤡"];

const ReactionMenu: React.FC<ReactionMenuProps> = ({ onReaction }) => {
  const { theme } = useThemeContext();
  const styles = createStyle(theme);

  return (
    <BlurredView style={styles.container}>
      <View style={styles.reactionRow}>
        {REACTIONS.map((emoji) => (
          <HoverAndPressedButton
            key={emoji}
            style={styles.reactionButton}
            onPress={() => onReaction(emoji)}
          >
            <Text style={styles.reactionText}>{emoji}</Text>
          </HoverAndPressedButton>
        ))}
      </View>
    </BlurredView>
  );
};

export default ReactionMenu;

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginBottom: 8,
      alignSelf: "flex-start",
      maxWidth: 175
    },
    reactionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    reactionButton: {
      padding: 8,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      width: 25,
      height: 25,
    },
    reactionText: {
      fontSize: 20,
      color: theme.text,
    },
  });
