import { useContext } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";
import useClipboard from "@/src/hooks/useClipboard";

//! @MatteoMagnani7 questo schifo è da rifare

interface CopyApiKeyButtonProps {
  text: string;
  label?: string;
  containerStyle?: any;
}

export default function CopyApiKeyButton({
  text,
  label,
  containerStyle,
}: CopyApiKeyButtonProps) {
  const { theme } = useContext(ThemeContext);
  const { copyToClipboard, copied } = useClipboard();
  const styles = createStyles(theme);

  const handleCopy = async () => {
    await copyToClipboard(text);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Typography text={label} />}
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Typography
            numberOfLines={1}
            ellipsizeMode="middle"
            text={text}
          />
        </View>
        <Pressable
          onPress={handleCopy}
          style={({ pressed, hovered }: any) => [
            styles.copyButton,
            hovered && styles.copyButtonHovered,
            pressed && styles.copyButtonPressed,
          ]}
        >
          <Icon name={copied ? "Tick01Icon" : "Copy01Icon"} size={20} />
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
    contentContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.secondary,
      borderRadius: 50,
      overflow: "hidden",
    },
    textContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    copyButton: {
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    copyButtonHovered: {
      backgroundColor: theme.backgroundHover,
      cursor: "pointer" as any,
    },
    copyButtonPressed: {
      opacity: 0.7,
    },
  });
