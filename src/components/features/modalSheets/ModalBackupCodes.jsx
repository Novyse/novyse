import { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";
import gateway from "@/src/utils/backend-services/api-gateway";

import useClipboard from "@/src/hooks/useClipboard";

const ModalBackupCodes = ({ visible, onClose, theme }) => {
  const styles = createStyles(theme);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  const { copyToClipboard, copied } = useClipboard();

  useEffect(() => {
    const getCodes = async () => {
      setLoading(true);
      const { success, codes: recoveryCodes } =
        await gateway.auth.getTwofaRecoverCodes();

      if (success) {
        setCodes(recoveryCodes);
      }
      setLoading(false);
    };

    if (visible) getCodes();
  }, [visible]);

  const handleCopy = async () => {
    const codesText = codes.join("\n");
    await copyToClipboard(codesText);
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      mode="adaptive"
      titleTranslationKey="modals.backup_codes.title"
    >
      <View style={styles.contentContainer}>
        <Typography translationKey="modals.backup_codes.subtitle" />
        {loading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : codes.length > 0 ? (
          <>
            <View style={styles.codesGrid}>
              {codes.map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <Typography text={code} />
                </View>
              ))}
            </View>
            <Icon
              name={copied ? "Tick01Icon" : "Copy01Icon"}
              onPress={handleCopy}
            />
          </>
        ) : (
          <Typography
            variant="danger"
            translationKey="modals.backup_codes.error"
          />
        )}
      </View>
    </AdaptiveModal>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    contentContainer: {
      alignItems: "center",
      padding: 20,
    },
    codesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginBottom: 25,
    },
    codeItem: {
      backgroundColor: theme.backgroundBackupCode,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      margin: 5,
      minWidth: "40%",
      alignItems: "center",
    },
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.backgroundIconButton,
    },
  });
}

export default ModalBackupCodes;
