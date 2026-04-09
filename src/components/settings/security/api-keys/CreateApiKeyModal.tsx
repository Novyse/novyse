import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import ModalBase from "../../../modalSheets/ModalBase";
import TextInput from "../../../input/TextInput";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";

interface CreateApiKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  isLoading: boolean;
  theme: any;
}

export default function CreateApiKeyModal({
  visible,
  onClose,
  onConfirm,
  isLoading,
  theme,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name);
      setName("");
    }
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.container}>
        <AppText style={styles.title} translationKey="settings.security.apiKeys.createModal.title" />
        <AppText style={styles.subtitle} translationKey="settings.security.apiKeys.createModal.subtitle" />
        <TextInput
          placeholder={t("settings.security.apiKeys.createModal.placeholder")}
          value={name}
          onChange={setName}
        />
        <Pressable
          onPress={handleConfirm}
          style={({ pressed, hovered }: any) => [
            styles.button,
            hovered && styles.buttonHovered,
            pressed && styles.buttonPressed,
            (!name.trim() || isLoading) && { opacity: 0.7 },
          ]}
          disabled={!name.trim() || isLoading}
        >
          <AppText 
            style={styles.buttonText}
            translationKey={isLoading ? "settings.security.apiKeys.createModal.creating" : "settings.security.apiKeys.createModal.create"}
          />
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
