import React, { useContext, useEffect } from "react"; // Aggiunto useEffect
import { StyleSheet, Alert, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar"; // Importa expo-navigation-bar
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Importa useSafeAreaInsets


import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import QRCodeReader from "../components/QRCodeReader";

import APIMethods from "../utils/APImethods";

const QRScanner = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const insets = useSafeAreaInsets(); // Ottieni gli insets di sicurezza

  // Gestione delle barre di sistema
  useEffect(() => {
    const hideBars = async () => {
      // Nascondi la status bar
      // (Già impostata come traslucida, ma possiamo renderla completamente invisibile se preferiamo)
      // StatusBar.setHidden(true, 'slide'); // Potresti volerla nascondere completamente, ma traslucida va bene per la camera

      // Nascondi la barra di navigazione (Android)
      await NavigationBar.setVisibilityAsync("hidden");
      // Puoi anche impostare il tipo di comportamento immersivo
      await NavigationBar.setSystemUIVisibility("immersive");
    };

    const showBars = async () => {
      // Mostra la status bar
      // StatusBar.setHidden(false, 'slide');

      // Mostra la barra di navigazione (Android)
      await NavigationBar.setVisibilityAsync("visible");
      await NavigationBar.setSystemUIVisibility("lean_back"); // O "system_bars"
    };

    hideBars(); // Chiama la funzione per nasconderle all'ingresso nella schermata

    // Funzione di cleanup: assicura che le barre vengano ripristinate
    // quando il componente viene smontato (ad esempio, quando l'utente lascia la schermata)
    return () => {
      showBars();
    };
  }, []); // Esegui solo una volta al montaggio e smontaggio

  const handleCodeScanned = async (content) => {
    try {
      console.log("QR Code content:", content);
      
      const success = await APIMethods.scanQRCodeAPI(content);

      if (!success) {
        Alert.alert("Errore", "QR Code non valido o già scansionato.");
        return;
      }

      Alert.alert("Successo", "L'accesso verrà eseguito a breve, attendi quale istante...");
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
        <HeaderWithBackArrow goBackTo="./" />
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
      position: "absolute", // Posizionamento assoluto per sovrapporsi alla camera
      top: 10, // Allineato al bordo superiore
      left: 10, // Allineato al bordo sinistro
      right: 0, // Si estende per tutta la larghezza (opzionale, dipende dal layout interno di HeaderWithBackArrow)
      // backgroundColor: 'rgba(0,0,0,0.3)', // Puoi aggiungere uno sfondo per visibilità durante il debug
      zIndex: 1, // Assicura che sia sopra la CameraView
      // Il paddingTop: insets.top verrà aggiunto direttamente inline
    },
  });

export default QRScanner;
