import React, { useState, useContext, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import logo_novyse from "../assets/images/logo-novyse.png";
import ScreenLayout from "./components/ScreenLayout";
import EmailCheckForm from "./welcome/email-check";
import JsonParser from "./utils/JsonParser";
import { LinearGradient } from "expo-linear-gradient";
import { LoginColors } from "@/constants/LoginColors";
import auth from "./utils/welcome/auth";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { colorScheme, theme } = useContext(ThemeContext);
  const styles = createStyle(theme, colorScheme);
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const loginTheme = "default";

  useEffect(() => {
    let isMounted = true;

    const checkLogged = async () => {
      try {
        console.log("Controllo in corso 🟡");
        const lastUpdateDateTime = await auth.getLastUpdateTimestamp();
        const isLoggedIn = await auth.isLoggedIn();

        if (isLoggedIn && isMounted) {
          console.log("Controllo positivo 🟢");
          JsonParser.updateAll(lastUpdateDateTime).catch((error) =>
            console.error("Errore in updateAll:", error)
          );
          router.replace("/messages");
        }
      } catch (error) {
        console.error("Errore durante il controllo login:", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            console.error(
              "Errore durante la rimozione dello splash screen:",
              error
            );
          }
        }
      }
    };

    checkLogged();

    const backAction = () => {
      Alert.alert("Hold on!", "Are you sure you want to go back? 😥", [
        { text: "Cancel", style: "cancel" },
        { text: "YES", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => {
      isMounted = false;
      backHandler.remove();
    };
  }, [router]);

  if (!isReady) {
    return (
      <LinearGradient
        colors={LoginColors[loginTheme].background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.containerStart}
      >
        <View
          style={[
            styles.containerStart,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Image source={logo_novyse} style={styles.logo} />
          <ActivityIndicator
            size="large"
            color={theme.primary || "#6cadd8ff"} // Fallback to blue if theme.primary is undefined
            style={styles.loader}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <ScreenLayout>
      <EmailCheckForm />
      <StatusBar style="light" backgroundColor={theme.backgroundClassic} />
    </ScreenLayout>
  );
};

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    containerStart: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20, // Space between logo and loader
    },
    loader: {
      marginTop: 10,
    },
  });
}
