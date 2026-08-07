import { useState } from "react";
import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/modalSheets/AdaptiveModal";
import TextInput from "@/src/components/ui/input/TextInput";
import Button from "@/src/components/ui/button/Button";
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
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="modal"
      titleTranslationKey="settings.privacyAndSecurity.apiKeys.createModal.title"
    >
      <View>
        <AppText
          style={styles.subtitle}
          translationKey="settings.privacyAndSecurity.apiKeys.createModal.subtitle"
        />
        <TextInput
          placeholder={t("settings.privacyAndSecurity.apiKeys.createModal.placeholder")}
          value={name}
          onChange={setName}
        />
        <Button
          translationKey={
            isLoading
              ? "settings.privacyAndSecurity.apiKeys.createModal.creating"
              : "settings.privacyAndSecurity.apiKeys.createModal.create"
          }
          onPress={handleConfirm}
          disabled={!name.trim() || isLoading}
          style={{ marginTop: 24 }}
        />
      </View>
    </AdaptiveModal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    subtitle: {
      fontSize: 14,
      color: theme.subtitle,
      marginBottom: 24,
      textAlign: "left",
      lineHeight: 20,
    },
  });
