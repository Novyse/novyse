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
    <ModalBase
      visible={visible}
      onClose={onClose}
      theme={theme}
      titleTranslationKey="settings.security.apiKeys.detailsModal.title"
    >
      <View style={styles.container}>
        <View style={styles.successIconContainer}>
          <Icon name="CheckmarkCircle02Icon" color={theme.iconSuccess} size={48} />
        </View>
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
    subtitle: {
      fontSize: 14,
      color: theme.subtitle,
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
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer" as any,
    },
    buttonPressed: {
      backgroundColor: theme.settingsPressedButton,
      opacity: 0.9,
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
