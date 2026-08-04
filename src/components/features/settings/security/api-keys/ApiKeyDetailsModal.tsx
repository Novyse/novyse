import { View, StyleSheet } from "react-native";
import AdaptiveModal from "@/src/components/modalSheets/AdaptiveModal";
import Icon from "@/src/components/ui/icon/Icon";
import CopyLabel from "@/src/components/CopyApiKeyButton";
import Button from "@/src/components/ui/button/Button";
import AppText from "@/src/components/ui/text/AppText";
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
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="modal"
      titleTranslationKey="settings.security.apiKeys.detailsModal.title"
    >
      <View style={styles.container}>
        <View style={styles.successIconContainer}>
          <Icon
            name="CheckmarkCircle02Icon"
            color={theme.iconSuccess}
            size={48}
          />
        </View>
        <AppText
          style={styles.subtitle}
          translationKey="settings.security.apiKeys.detailsModal.subtitle"
        />

        <CopyLabel
          text={apiKey}
          label={t("settings.security.apiKeys.detailsModal.label")}
        />

        <Button
          translationKey="settings.security.apiKeys.detailsModal.saved"
          onPress={onClose}
          style={{ marginTop: 25 }}
        />
      </View>
    </AdaptiveModal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
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
  });
