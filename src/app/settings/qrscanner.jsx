import React, { useContext, useEffect } from "react";
import { StyleSheet, Alert, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import QRCodeReader from "@/src/components/QRCodeReader";

import gateway from "@/src/utils/backend-services/api-gateway";

const QRScanner = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const insets = useSafeAreaInsets();

  // Gestione delle barre di sistema
  // useEffect(() => {
  //   const hideBars = async () => {
  //     // Nascondi la barra di navigazione (Android)
  //     await NavigationBar.setVisibilityAsync("hidden");
  //     // Puoi anche impostare il tipo di comportamento immersivo
  //     await NavigationBar.setSystemUIVisibility("immersive");
  //   };

  //   const showBars = async () => {
  //     // Mostra la barra di navigazione (Android)
  //     await NavigationBar.setVisibilityAsync("visible");
  //     await NavigationBar.setSystemUIVisibility("lean_back");
  //   };

  //   hideBars();

  //   return () => {
  //     showBars();
  //   };
  // }, []); // Esegui solo una volta al montaggio e smontaggio

  const handleCodeScanned = async (content) => {
    try {
      console.log("QR Code content:", content);

      const success = await gateway.auth.scanQRCodeToken(content);

      if (!success) {
        Alert.alert("Errore", "QR Code non valido o già scansionato.");
        return;
      }

      Alert.alert(
        "Successo",
        "L'accesso verrà eseguito a breve, attendi quale istante..."
      );
    } catch (error) {
      Alert.alert("Errore", "Impossibile gestire la scansione del codice QR.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        style="light"
        backgroundColor={"transparent"}
        translucent={true}
        hidden={true}
      />
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <HeaderWithBackArrow title={"QR Scanner"}/>
      </View>
      <QRCodeReader onCodeScanned={handleCodeScanned} />
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    headerContainer: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 0,
      // backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 1,
      
    },
  });

export default QRScanner;
