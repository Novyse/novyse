import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import ModalBase from "../../../modalSheets/ModalBase";
import TextInput from "@/src/components/ui/input/TextInput";
import AppText from "@/src/components/ui/text/AppText";
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
    <ModalBase
      visible={visible}
      onClose={onClose}
      theme={theme}
      titleTranslationKey="settings.security.apiKeys.createModal.title"
    >
      <View style={styles.container}>
        <AppText
          style={styles.subtitle}
          translationKey="settings.security.apiKeys.createModal.subtitle"
        />
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
            translationKey={
              isLoading
                ? "settings.security.apiKeys.createModal.creating"
                : "settings.security.apiKeys.createModal.create"
            }
          />
        </Pressable>
      </View>
    </ModalBase>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      width: 400,
      maxWidth: "100%",
    },
    subtitle: {
      fontSize: 14,
      color: theme.subtitle,
      marginBottom: 24,
      textAlign: "center",
      lineHeight: 20,
    },
    button: {
      backgroundColor: theme.secondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 24,
    },
    buttonHovered: {
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer" as any,
    },
    buttonPressed: {
      backgroundColor: theme.settingsPressedButton,
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
