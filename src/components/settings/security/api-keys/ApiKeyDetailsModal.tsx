import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import ModalBase from "../../../modalSheets/ModalBase";
import Icon from "../../../Icon";
import CopyLabel from "../../../CopyLabel";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.container}>
        <View style={styles.successIconContainer}>
          <Icon name="CheckmarkCircle02Icon" color="#10b981" size={48} />
        </View>
        <AppText style={styles.title} translationKey="settings.security.apiKeys.detailsModal.title" />
        <AppText style={styles.subtitle} translationKey="settings.security.apiKeys.detailsModal.subtitle" />

        <CopyLabel text={apiKey} label={t("settings.security.apiKeys.detailsModal.label")} />

        <Pressable
          onPress={onClose}
          style={({ pressed, hovered }: any) => [
            styles.button,
            hovered && styles.buttonHovered,
            pressed && styles.buttonPressed,
          ]}
        >
          <AppText style={styles.buttonText} translationKey="settings.security.apiKeys.detailsModal.saved" />
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
      backgroundColor: theme.primary,
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
