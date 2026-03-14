import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import ModalBase from "./ModalBase";

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
    <ModalBase visible={visible} onClose={onClose} theme={theme} fullscreen={fullscreen}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Delete Messages</Text>
        <Text style={styles.subtitle}>
          Are you sure you want to delete {messageCount} message
          {messageCount > 1 ? "s" : ""}? This will delete for everyone.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={onDeletePress}
          >
            <Text style={[styles.buttonText, styles.deleteButtonText]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalBase>
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
      color: theme?.text || "#000",
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
      color: theme?.text || "#333",
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
      backgroundColor: theme?.primary || "#eee",
    },
    deleteButton: {
      backgroundColor: theme?.errorText || "red",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: theme?.text || "#000",
    },
    deleteButtonText: {
      color: "#fff",
    },
  });
}

export default DeleteMessage;
