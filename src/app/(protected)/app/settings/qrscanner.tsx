import React, { useContext } from "react";
import { StyleSheet, Alert, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MyStatusBar from "@/src/components/MyStatusBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import QRCodeReader from "@/src/components/QRCodeReader";

import gateway from "@/src/utils/backend-services/api-gateway";

export default function QrscannerRoute() {
  const { t } = useTranslation();
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const insets = useSafeAreaInsets();

  const handleCodeScanned = async (content: string) => {
    try {
      console.log("QR Code content:", content);

      const success = await gateway.auth.scanQRCodeToken(content);

      if (!success) {
        Alert.alert(t("common.error"), t("settings.qrScanner.invalidCode"));
        return;
      }

      Alert.alert(
        t("common.success"),
        t("settings.qrScanner.loginSuccess"),
      );
    } catch (error) {
      Alert.alert("Errore", "Impossibile gestire la scansione del codice QR.");
    }
  };

  return (
    <View style={styles.container}>
      <MyStatusBar
        style="light"
        backgroundColor={"transparent"}
        translucent={true}
        hidden={true}
      />
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <HeaderWithBackArrow translationKey="settings.menu.qrScanner" onBack={onBack} />
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
  });
