import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
// 1. Importa l'hook per la Safe Area
import { useSafeAreaInsets } from "react-native-safe-area-context"; 

import Icon from "./Icon";
import HeaderBase from "./HeaderBase";
import BlurredView from "./BlurredView";

const HeaderWithBackArrow = ({ goBackTo, title }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();
  
  
  const insets = useSafeAreaInsets(); 

  return (
    // 3. Aggiungi { top: insets.top } allo stile. 
    // Puoi aggiungere un po' di margine extra (+ 10) se vuoi che respiri di più.
    <HeaderBase style={[styles.container, { top: insets.top }]}>
      <BlurredView>
        <Icon
          name={"ArrowLeft02Icon"}
          onPress={() => {
            if (goBackTo) {
              router.navigate(goBackTo);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.navigate("/chat");
            }
          }}
          style={styles.icon}
        />
      </BlurredView>
      {title && (
        <BlurredView style={styles.titleContainer}>
          <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </BlurredView>
      )}
    </HeaderBase>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      gap: 10,
      justifyContent: "flex-start",
      position: "absolute",
      left: 10,
      zIndex: 100,
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    titleContainer: {
      height: 45,
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    titleText: {
      fontSize: 18,
      fontWeight: "600",
      color: "white",
      textAlign: "center",
    },
  });

export default HeaderWithBackArrow;