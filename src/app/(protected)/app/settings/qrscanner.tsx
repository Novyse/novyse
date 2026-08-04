import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import QRCodeReader from "@/src/components/QRCodeReader";
import StatusMessage from "@/src/components/features/status/StatusMessage";

import auth from "@/src/utils/backend-services/auth";

export default function QrscannerRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const insets = useSafeAreaInsets();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCodeScanned = async (content: string) => {
    try {
      const response = await auth.qrcode.authenticate(content);

      if (!response.success) {
        setError(t("settings.qrScanner.invalidCode"));
        return;
      }

      setSuccess(t("settings.qrScanner.loginSuccess"));
    } catch (error) {
      setError(t("settings.qrScanner.scanError"));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <HeaderWithBackArrow
          translationKey="settings.menu.qrScanner"
          onBack={onBack}
        />
      </View>

      <View style={[styles.statusMessageContainer, { top: insets.top + 80 }]}>
        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <StatusMessage
          type="success"
          content={[success || ""]}
          visible={!!success}
          timeout={3000}
          onClose={() => setSuccess(null)}
        />
      </View>

      <QRCodeReader onCodeScanned={handleCodeScanned} />
    </View>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    headerContainer: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 0,
      zIndex: 1,
    },
    statusMessageContainer: {
      position: "absolute",
      left: 10,
      right: 10,
      zIndex: 10,
    },
  });
