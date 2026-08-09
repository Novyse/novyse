import React, { useContext } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";

interface ShortcutItemProps {
  label?: string;
  translationKey?: string;
  keys: string[];
  onPress?: () => void;
  disabled?: boolean;
}

const ShortcutItem = ({
  label,
  translationKey,
  keys,
  onPress = () => {},
  disabled,
}: ShortcutItemProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled}
    >
      {translationKey ? (
        <Typography translationKey={translationKey} />
      ) : (
        <Typography text={label} />
      )}
      <View style={styles.keysContainer}>
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <View style={styles.keyBox}>
              <Typography text={key.toUpperCase()} />
            </View>
            {index < keys.length - 1 && <Typography text="+" />}
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
      backgroundColor: theme.backgroundMainSecondary,
      borderRadius: 12,
      marginVertical: 4,
    },
    keysContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    keyBox: {
      backgroundColor: theme.backgroundCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 32,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
    },
  });

export default ShortcutItem;
