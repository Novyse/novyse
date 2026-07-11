import type {
  MarkdownStyle,
  MarkdownTextInputStyle,
} from "react-native-enriched-markdown";
import type { Theme } from "@/src/context/ThemeContext";

export const getMarkdownStyle = (
  theme: Theme,
): MarkdownStyle & MarkdownTextInputStyle => ({
  paragraph: { color: theme.text },
  h1: { color: theme.text },
  h2: { color: theme.text },
  h3: { color: theme.text },
  h4: { color: theme.text },
  h5: { color: theme.text },
  h6: { color: theme.text },
  list: { color: theme.text },
  link: { color: theme.textLink, underline: true },
  strong: { fontWeight: "bold" },
  em: { fontStyle: "italic" },
  highlight: { backgroundColor: theme.primary + "60", color: theme.text },
  spoiler: {
    color: theme.primary,
    backgroundColor: theme.backgroundSearchResultItem,
    particles: { density: 25, speed: 45 },
    solid: { borderRadius: 6 },
  },
  math: {
    fontSize: 20,
    color: theme.text,
    backgroundColor: theme.borderColor,
    padding: 12,
    textAlign: "center",
  },
  inlineMath: {
    color: theme.textLink || theme.primary,
  },
  table: {
    color: theme.text,
    headerBackgroundColor: theme.iconHovered,
    headerTextColor: theme.text,
    rowEvenBackgroundColor: "transparent",
    rowOddBackgroundColor: theme.iconHovered,
    borderColor: theme.borderColor,
    borderWidth: 1,
    borderRadius: 8,
    cellPaddingHorizontal: 10,
    cellPaddingVertical: 8,
  },
  taskList: {
    checkedColor: theme.primary,
    borderColor: theme.borderColor,
    checkboxSize: 18,
    checkboxBorderRadius: 6,
    checkmarkColor: theme.backgroundCard,
    checkedTextColor: theme.placeholderText,
    checkedStrikethrough: true,
  },
});
