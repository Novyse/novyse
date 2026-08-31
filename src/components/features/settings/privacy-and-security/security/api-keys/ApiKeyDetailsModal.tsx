import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Icon from "@/src/components/ui/icon/Icon";
import CopyLabel from "@/src/components/features/settings/privacy-and-security/security/api-keys/CopyApiKeyButton";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";
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
  const styles = createStyles();

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      mode="modal"
      titleTranslationKey="settings.privacyAndSecurity.apiKeys.detailsModal.title"
    >
      <View style={styles.container}>
        <View style={styles.successIconContainer}>
          <Icon
            name="CheckmarkCircle02Icon"
            color={theme.iconSuccess}
            size={40}
          />
        </View>
        <Typography
          variant="subtitle"
          translationKey="settings.privacyAndSecurity.apiKeys.detailsModal.subtitle"
        />

        <CopyLabel
          text={apiKey}
          label={t("settings.privacyAndSecurity.apiKeys.detailsModal.label")}
        />

        <Button
          translationKey="settings.privacyAndSecurity.apiKeys.detailsModal.saved"
          onPress={onClose}
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
    successIconContainer: {
      alignItems: "center",
    },
  });
