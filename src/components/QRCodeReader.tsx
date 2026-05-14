import React, { useState, useEffect, useContext } from "react";
import { StyleSheet, View, Button } from "react-native";
import {
  CameraView,
  CameraType,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";

import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";

interface QRCodeReaderProps {
  onCodeScanned: (data: string) => void;
}

export default function QRCodeReader({ onCodeScanned }: QRCodeReaderProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  const handleQRCodeScanned = ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    onCodeScanned(data);
  };

  useEffect(() => {
    // Reimposta lo stato `scanned` se necessario per permettere nuove scansioni
    // Potresti volerlo resettare dopo un certo tempo o un'azione dell'utente
  }, [scanned]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <AppText translationKey="common.qrReader.requestingPermissions" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <AppText
          style={{ textAlign: "center" }}
          translationKey="common.qrReader.needPermissions"
        />
        <Button
          onPress={requestPermission}
          title={t("common.qrReader.grantPermission")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleQRCodeScanned}
      >
        <View style={styles.buttonContainer} />
        {!scanned && (
          <View style={styles.overlay}>
            <View style={styles.qrFrame} />
            <AppText
              style={styles.instructionText}
              translationKey="common.qrReader.instruction"
            />
          </View>
        )}
        {scanned && (
          <Button
            title={t("common.qrReader.scanAgain")}
            onPress={() => setScanned(false)}
          />
        )}
      </CameraView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.shadowColor,
    },
    camera: {
      flex: 1,
      width: "100%",
      justifyContent: "flex-end",
      height: "100%",
    },
    buttonContainer: {
      flexDirection: "row",
      backgroundColor: "transparent",
      marginBottom: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.backgroundModalOverlay,
    },
    qrFrame: {
      width: 250,
      height: 250,
      borderColor: theme.text,
      borderWidth: 3,
      borderRadius: 10,
      backgroundColor: "transparent",
      marginBottom: 20,
    },
    instructionText: {
      color: theme.text,
      fontSize: 18,
      marginTop: 10,
    },
  });
