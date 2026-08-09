import { useState } from "react";
import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import TextInput from "@/src/components/ui/input/TextInput";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";
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
  const styles = createStyles();

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
      <View style={styles.container}>
        <Typography
          variant="subtitle"
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
        />
      </View>
    </AdaptiveModal>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      gap: 25,
    },
  });
