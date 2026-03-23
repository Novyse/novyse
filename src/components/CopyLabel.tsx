import React, { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "./Icon";
import useClipboard from "@/src/hooks/useClipboard";

interface CopyLabelProps {
  text: string;
  label?: string;
  containerStyle?: any;
}

export default function CopyLabel({ text, label, containerStyle }: CopyLabelProps) {
  const { theme } = useContext(ThemeContext);
  const { copyToClipboard, copied } = useClipboard();
  const styles = createStyles(theme);

  const handleCopy = async () => {
    await copyToClipboard(text);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.text} numberOfLines={1} ellipsizeMode="middle">
            {text}
          </Text>
        </View>
        <Pressable
          onPress={handleCopy}
          style={({ pressed, hovered }: any) => [
            styles.copyButton,
            hovered && styles.copyButtonHovered,
            pressed && styles.copyButtonPressed,
          ]}
        >
          <Icon
            name={copied ? "Tick01Icon" : "Copy01Icon"}
            color={copied ? "#10b981" : theme.text}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    label: {
      fontSize: 14,
      color: "#a0a0a0",
      marginBottom: 8,
      fontWeight: "500",
    },
    contentContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      overflow: "hidden",
    },
    textContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    text: {
      color: theme.text,
      fontSize: 14,
      fontFamily: "monospace",
    },
    copyButton: {
      padding: 12,
      borderLeftWidth: 1,
      borderLeftColor: theme.divider,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.backgroundCard,
    },
    copyButtonHovered: {
      backgroundColor: theme.backgroundHover,
      cursor: "pointer" as any,
    },
    copyButtonPressed: {
      opacity: 0.7,
    },
  });
