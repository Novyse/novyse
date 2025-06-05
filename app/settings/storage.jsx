import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import DatabaseSizeChart from "../components/DatabaseSizeChart";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <LinearGradient
      colors={theme.settingPagesGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <HeaderWithBackArrow 
        goBackTo="./SettingsMenu"
      />
      <DatabaseSizeChart/>
    </LinearGradient>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
  });

export default StoragePage;
