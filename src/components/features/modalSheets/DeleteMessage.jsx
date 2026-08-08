import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Typography from "@/src/components/ui/typography/Typography";

const DeleteMessage = ({
  visible,
  onClose,
  onDelete,
  messageCount = 1,
  theme,
  fullscreen,
}) => {
  const styles = createStyles(theme);

  const onDeletePress = () => {
    onDelete();
    onClose();
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="modal"
      fullscreen={fullscreen}
      titleTranslationKey="modals.delete_message.title"
    >
      <View style={styles.contentContainer}>
        <Typography
          style={styles.subtitle}
          translationKey="modals.delete_message.subtitle"
          translationOptions={{ count: messageCount }}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Typography
              style={[styles.buttonText, styles.cancelButtonText]}
              translationKey="modals.delete_message.cancel"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={onDeletePress}
          >
            <Typography
              style={[styles.buttonText, styles.deleteButtonText]}
              translationKey="modals.delete_message.delete"
            />
          </TouchableOpacity>
        </View>
      </View>
    </AdaptiveModal>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    contentContainer: {
      alignItems: "center",
      padding: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
      color: theme.subtitle,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 10,
      gap: 15,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: theme.primary,
    },
    deleteButton: {
      backgroundColor: theme.backgroundDanger,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: theme.text,
    },
    deleteButtonText: {
      color: theme.text,
    },
  });
}

export default DeleteMessage;
