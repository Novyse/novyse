import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function QRCodeReader({ onCodeScanned }) {
  const [facing, setFacing] = useState("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false); // Stato per gestire se un codice è già stato scansionato

  const handleQRCodeScanned = ({ data }) => {
    setScanned(true); // Imposta lo stato a true per evitare scansioni multiple
    onCodeScanned(data); // Passa il codice scansionato al gestore esterno
  };

  useEffect(() => {
    // Reimposta lo stato `scanned` se necessario per permettere nuove scansioni
    // Potresti volerlo resettare dopo un certo tempo o un'azione dell'utente
  }, [scanned]);

  if (!permission) {
    // I permessi della fotocamera sono ancora in fase di caricamento
    return (
      <View style={styles.container}>
        <Text>Richiesta permessi...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // I permessi della fotocamera non sono stati concessi
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
        // Abilita la scansione dei codici a barre e specifica di cercare solo i QR code
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleQRCodeScanned} // La callback viene attivata solo se !scanned
      >
        <View style={styles.buttonContainer}>
          {/* Button for toggling camera facing if needed, though not strictly necessary for QR scanning */}
          {/* <Button onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))} title="Flip Camera" /> */}
        </View>
        {!scanned && (
          <View style={styles.overlay}>
            <View style={styles.qrFrame} />
            <Text style={styles.instructionText}>Inquadra un codice QR</Text>
          </View>
        )}
        {scanned && (
          <Button
            title={"Tocca per scansionare di nuovo"}
            onPress={() => setScanned(false)}
            style={styles.scanAgainButton}
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
    height: "100%"
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
    backgroundColor: "rgba(0,0,0,0.4)", // Semi-transparent overlay
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
    color: "#FFF",
    fontSize: 18,
    marginTop: 10,
  },
  scanAgainButton: {
    position: "absolute",
    bottom: 50,
    left: "50%",
    transform: [{ translateX: -100 }], // Adjust to center
  },
});
