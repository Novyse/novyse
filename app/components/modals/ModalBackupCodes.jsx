import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import ModalBase from "./ModalBase";
import * as Clipboard from "expo-clipboard";
import Icon from "../Icon";
import gateway from "@/app/utils/backend-services/api-gateway";

const ModalBackupCodes = ({ visible, onClose, theme }) => {
  const styles = createStyles(theme);
  const [codes, setCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const copyToClipboard = async () => {
    // Note: Clipboard.setStringAsync expects a string. Joining the array.
    await Clipboard.setStringAsync(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Save your Backup Codes</Text>
        <Text style={styles.subtitle}>
          Keep these codes in a safe place. You will need them to recover your
          account.
        </Text>
        {loading ? (
          <View style={styles.iconButton}>
            <ActivityIndicator color={theme.icon} size="small" />
          </View>
        ) : codes.length > 0 ? (
          <>
            <View style={styles.codesGrid}>
              {codes.map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <Text style={styles.codeText}>{code}</Text>
                </View>
              ))}
            </View>
            <Icon
              name={copied ? "Tick01Icon" : "Copy01Icon"}
              onPress={copyToClipboard}
            />
          </>
        ) : (
          <Text style={styles.error}>
            All codes has been used, regenerate them
          </Text>
        )}
      </View>
    </ModalBase>
  );
};

function createStyles(theme) {
  return StyleSheet.create({
    contentContainer: {
      alignItems: "center",
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
      color: theme.errorText,
      backgroundColor: theme.backgroundError,
      padding: 5,
      borderRadius: 8,
      marginBottom: 40,
    },
    loading: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 20,
    },
    iconButton: {
      padding: 10,
      borderRadius: 8,
      backgroundColor: theme.backgroundIconButton,
    },
  });
}

export default ModalBackupCodes;
