import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import ModalBase from "../../../modalSheets/ModalBase";
import Icon from "../../../Icon";
import CopyLabel from "../../../CopyLabel";

interface ApiKeyDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  apiKey: string;
  theme: any;
}

export default function ApiKeyDetailsModal({
  visible,
  onClose,
  apiKey,
  theme,
}: ApiKeyDetailsModalProps) {
  const styles = createStyles(theme);

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.container}>
        <View style={styles.successIconContainer}>
          <Icon name="CheckmarkCircle02Icon" color="#10b981" size={48} />
        </View>
        <Text style={styles.title}>API Key Created</Text>
        <Text style={styles.subtitle}>
          Please copy your API key now. For security reasons, you won't be able
          to see it again.
        </Text>

        <CopyLabel text={apiKey} label="Your API Key" />

        <Pressable
          onPress={onClose}
          style={({ pressed, hovered }: any) => [
            styles.button,
            hovered && styles.buttonHovered,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>I've saved it</Text>
        </Pressable>
      </View>
    </ModalBase>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 24,
      width: 400,
      maxWidth: "100%",
    },
    successIconContainer: {
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: "#a0a0a0",
      marginBottom: 24,
      textAlign: "center",
      lineHeight: 20,
    },
    button: {
      backgroundColor: "#6366f1",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 24,
    },
    buttonHovered: {
      backgroundColor: "#5558e6",
      cursor: "pointer" as any,
    },
    buttonPressed: {
      backgroundColor: "#4e51d4",
      opacity: 0.9,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
