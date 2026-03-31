import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from "expo-camera";

interface QRCodeReaderProps {
  onCodeScanned: (data: string) => void;
}

export default function QRCodeReader({ onCodeScanned }: QRCodeReaderProps) {
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
        <Text>Richiesta permessi...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          Abbiamo bisogno del permesso per accedere alla fotocamera per
          scansionare i codici QR.
        </Text>
        <Button onPress={requestPermission} title="Concedi Permesso" />
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
            <Text style={styles.instructionText}>Inquadra un codice QR</Text>
          </View>
        )}
        {scanned && (
          <Button
            title="Tocca per scansionare di nuovo"
            onPress={() => setScanned(false)}
          />
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderColor: "#FFF",
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  instructionText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 10,
  },
  scanAgainButton: {
    position: "absolute",
    bottom: 50,
    left: "50%",
    transform: [{ translateX: -100 }],
  },
});