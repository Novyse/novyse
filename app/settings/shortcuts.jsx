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
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />
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
      padding: 10,
    },
    text: {
      color: theme.text
    }
  });

export default ShortcutsPage;
