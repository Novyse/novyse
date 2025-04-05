import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow 
        goBackTo="./SettingsMenu"
      />
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
      padding: 10,
    },
  });

export default StoragePage;
