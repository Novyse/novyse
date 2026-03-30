import React, { useContext } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

interface ShortcutItemProps {
  label: string;
  keys: string[];
  onPress?: () => void;
}

const ShortcutItem = ({
  label,
  keys,
  onPress = () => {},
}: ShortcutItemProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.keysContainer}>
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <View style={styles.keyBox}>
              <Text style={styles.keyText}>{key.toUpperCase()}</Text>
            </View>
            {index < keys.length - 1 && <Text style={styles.plus}>+</Text>}
          </React.Fragment>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor:
        theme.backgroundSettingsCardsSecondary || "rgba(255, 255, 255, 0.05)",
      borderRadius: 12,
      marginVertical: 4,
    },
    label: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "500",
      flex: 1,
    },
    keysContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    keyBox: {
      backgroundColor: theme.backgroundCard || "#1a1a1a",
      borderColor: theme.border || "#333",
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 32,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
    keyText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "700",
      fontFamily: "monospace",
    },
    plus: {
      color: theme.text,
      marginHorizontal: 4,
      fontSize: 14,
      fontWeight: "bold",
    },
  });

export default ShortcutItem;
