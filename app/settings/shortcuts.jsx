import React, { useContext } from "react";
import { StyleSheet, View, Text } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";

const ShortcutsPage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <View style={styles.container}>
        <Text style={styles.textTemp}>
          Implementate per ora solo su VocalContentBottomBar
        </Text>
        <Text style={styles.text}>Work in progress</Text>
        <Text style={styles.text}>Mute: ctrl + F12</Text>
      </View>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    text: {
      color: theme.text,
    },
    textTemp: {
      color: "red",
      marginVertical: 10,
      fontSize: 15,
    },
  });

export default ShortcutsPage;
