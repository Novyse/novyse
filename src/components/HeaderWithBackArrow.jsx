import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
// 1. Importa l'hook per la Safe Area
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "./Icon";
import HeaderBase from "./HeaderBase";
import BlurredView from "./BlurredView";

const HeaderWithBackArrow = ({ title, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const insets = useSafeAreaInsets();

  return (
    // 3. Aggiungi { top: insets.top } allo stile.
    // Puoi aggiungere un po' di margine extra (+ 10) se vuoi che respiri di più.
    <HeaderBase style={[styles.container, { top: insets.top }]}>
      <BlurredView
        style={{
          flexDirection: "row",
          width: "100%",
          justifyContent: "space-between",
          padding: 4,
        }}
      >
        <Icon
          name={"ArrowLeft02Icon"}
          onPress={() => {onBack()}}
          style={styles.icon}
        />
        {title && (
          <View style={styles.titleContainer}>
            <Text
              style={styles.titleText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </View>
        )}

        <View style={styles.icon} />
      </BlurredView>
    </HeaderBase>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      gap: 10,
      justifyContent: "flex-start",
      position: "absolute",
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
