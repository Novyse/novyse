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
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import logo_novyse from "@/assets/images/logo-novyse.png";

import ScreenLayout from "@/src/components/ScreenLayout";
import EmailCheckForm from "./welcome";

import { LinearGradient } from "expo-linear-gradient";
import { LoginColors } from "@/constants/LoginColors";

import auth from "@/src/utils/welcome/auth";

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

    const backAction = () => {
      Alert.alert("Hold on!", "Are you sure you want to go back? 😥", [
        { text: "Cancel", style: "cancel" },
        { text: "YES", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const navigateBasedOnAuth = async () => {
      const success = await auth.isLoggedIn();
      if (isMounted) {
        setIsReady(true);
        await SplashScreen.hideAsync();
        if (success) {
          router.replace("/chat");
        } else {
          router.replace("/welcome");
        }
      }
    };

    navigateBasedOnAuth();

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
            color={theme.primary}
            style={styles.loader}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <ScreenLayout>
      <EmailCheckForm />
      <StatusBar/>
    </ScreenLayout>
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
    logo: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    loader: {
      marginTop: 10,
    },
  });
}
