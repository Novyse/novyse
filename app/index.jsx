import React, { useState, useContext, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  BackHandler,
  Alert,
  Image,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import JsonParser from "./utils/JsonParser";
import { SplashScreen } from "expo-router";
import logo_novyse_bg from "../assets/images/logo-novyse-bg.png";
import ScreenLayout from "./components/ScreenLayout";

import EmailCheckForm from "./welcome/emailcheck";

// Impedisce la rimozione automatica dello splash screen
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkLogged = async () => {
      try {
        console.log("Controllo in corso 🟡");
        // Leggi più chiavi in parallelo per ottimizzare
        const [[, isLoggedIn], [, lastUpdateDateTime]] =
          await AsyncStorage.multiGet(["isLoggedIn", "lastUpdateDateTime"]);
        if (isLoggedIn === "true") {
          console.log("Controllo positivo 🟢");
          // Esegui updateAll in background
          JsonParser.updateAll(lastUpdateDateTime).catch((error) =>
            console.error("Errore in updateAll:", error)
          );
          // Usa replace per una navigazione pulita
          router.navigate("/messages");
        }
      } catch (error) {
        console.error("Errore durante il controllo login:", error);
      } finally {
        setIsReady(true);
        // Nasconde lo splash screen solo quando il controllo è completato
        await SplashScreen.hideAsync();
      }
    };
    checkLogged();

    // Gestione del tasto indietro
    const backAction = () => {
      Alert.alert("Hold on!", "Are you sure you want to go back? 😥", [
        { text: "Cancel", onPress: () => null, style: "cancel" },
        { text: "YES", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);
  // Mostra un indicatore di caricamento finché lo splash screen è attivo
  if (!isReady) {
    return (
      <ScreenLayout>
        <View
          style={[
            styles.containerStart,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Image source={logo_novyse_bg} style={{ width: 100, height: 100 }} />
          {/* <Text style={{ color: theme.text }}>Caricamento...</Text> */}
        </View>
      </ScreenLayout>
    );
  }
  return (
    // <ScreenLayout>
    //   <View style={styles.containerStart}>
    //     <Text style={styles.welcomeText}>BENVENUTO</Text>
    //     <Pressable
    //       style={styles.containerStartButton}
    //       onPress={() => router.navigate(`/welcome/EmailCheckForm`)}
    //     >
    //       <MaterialIcons name="arrow-forward" size={52} color={theme.icon} />
    //     </Pressable>

    //   </View>
    //   <StatusBar style="light" backgroundColor={theme.backgroundClassic} />
    // </ScreenLayout>
    <EmailCheckForm />
  );
}

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    containerStart: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    welcomeText: {
      color: theme.text,
      fontSize: 56,
      marginBottom: 20,
      fontWeight: "700",
      top: -200,
    },
    containerStartButton: {},
  });
}
