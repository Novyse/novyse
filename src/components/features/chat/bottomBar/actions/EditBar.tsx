import React, { useContext } from "react";
import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import BlurredView from "@/src/components/layout/BlurredView";

interface EditingMessage {
  content?: string;
  [key: string]: any;
}

interface EditBarProps {
  editingMessage: EditingMessage | null;
  onCancelEdit: () => void;
}

const EditBar: React.FC<EditBarProps> = ({ editingMessage, onCancelEdit }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  if (!editingMessage) return null;

  return (
    <BlurredView style={styles.actionContainer}>
      <Icon name="Pen01Icon" size={18} />
      <View style={styles.actionAccent} />
      <View style={{ flex: 1 }}>
        <Typography
          size="sm"
          weight="semibold"
          numberOfLines={1}
          translationKey="chat.bottomBar.editing"
        />
        <Typography
          size="sm"
          variant="subtitle"
          numberOfLines={1}
          text={editingMessage.content ?? ""}
        />
      </View>
      <Icon name="Cancel01Icon" size={18} onPress={onCancelEdit} />
    </BlurredView>
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    actionContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 25,
      marginBottom: 5,
      gap: 10,
    },
    actionAccent: {
      width: 3,
      borderRadius: 2,
      alignSelf: "stretch",
      backgroundColor: theme.icon,
    },
  });

export default EditBar;
