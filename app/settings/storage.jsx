import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import SmartBackground from "../components/SmartBackground";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import DatabaseSizeChart from "../components/DatabaseSizeChart";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <SmartBackground
      colors={theme.settingPagesGradient}
      style={styles.container}
    >
      <HeaderWithBackArrow goBackTo="./" />
      <DatabaseSizeChart />
    </SmartBackground>
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
