import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import AdaptiveModal from "./AdaptiveModal";
import Icon from "../Icon";
import AppText from "../AppText";
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
    <AdaptiveModal visible={visible} onClose={onClose} theme={theme} mode="adaptive">
      <View style={styles.contentContainer}>
        <AppText
          style={styles.title}
          translationKey="modals.backup_codes.title"
        />
        <AppText
          style={styles.subtitle}
          translationKey="modals.backup_codes.subtitle"
        />
        {loading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : codes.length > 0 ? (
          <>
            <View style={styles.codesGrid}>
              {codes.map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <AppText style={styles.codeText} text={code} />
                </View>
              ))}
            </View>
            <Icon
              name={copied ? "Tick01Icon" : "Copy01Icon"}
              onPress={handleCopy}
            />
          </>
        ) : (
          <AppText
            style={styles.error}
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
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.text,
    },
    subtitle: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 20,
      color: theme.text,
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
    codeText: {
      fontSize: 18,
      fontWeight: "500",
      letterSpacing: 2,
    },
    error: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.dangerText,
      backgroundColor: theme.backgroundDanger,
      padding: 5,
      borderRadius: 8,
      marginBottom: 40,
    },
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.backgroundIconButton,
    },
  });
}

export default ModalBackupCodes;
