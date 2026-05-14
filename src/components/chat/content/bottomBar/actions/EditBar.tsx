import React, { useContext } from "react";
import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import AppText from "@/src/components/AppText";
import Icon from "@/src/components/Icon";
import BlurredView from "@/src/components/BlurredView";

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
      <Icon name="PencilEdit02Icon" size={18} />
      <View style={styles.actionAccent} />
      <View style={{ flex: 1 }}>
        <AppText
          style={[styles.actionName, { color: theme.icon }]}
          numberOfLines={1}
          translationKey="chat.bottomBar.editing"
        />
        <AppText
          style={styles.actionText}
          numberOfLines={1}
          text={editingMessage.content ?? ""}
        />
      </View>
      <Icon
        name="Cancel01Icon"
        size={18}
        color={theme.placeholderText}
        onPress={onCancelEdit}
      />
    </BlurredView>
  );
};

interface Styles {
  actionContainer: ViewStyle;
  actionAccent: ViewStyle;
  actionName: TextStyle;
  actionText: TextStyle;
}

const createStyle = (theme: any): Styles =>
  StyleSheet.create({
    actionContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 20,
      marginBottom: 5,
      gap: 10,
    },
    actionAccent: {
      width: 3,
      borderRadius: 2,
      alignSelf: "stretch",
      backgroundColor: theme.icon,
    },
    actionName: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 13,
    },
    actionText: {
      color: theme.placeholderText,
      fontSize: 13,
    },
  });

export default EditBar;
