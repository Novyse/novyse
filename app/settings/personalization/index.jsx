import React, { useContext } from "react";
import { StyleSheet, ScrollView, View} from "react-native"; // Aggiungi ScrollView
import { ThemeContext } from "@/context/ThemeContext";
import SettingsMenuItem from "../../components/SettingsMenuItem";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import {
  PaintBoardIcon,
} from "@hugeicons/core-free-icons";
import ScreenLayout from "../../components/ScreenLayout";

const PrivacyAndSecurityMenu = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SettingsMenuItem
            navToPage="./personalization/themes"
            pageName="Themes"
            iconName={PaintBoardIcon}
          />
        </ScrollView>
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
  });

export default PrivacyAndSecurityMenu;
