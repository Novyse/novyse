import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeContext } from "@/src/context/ThemeContext";
import StatusMessage from "@/src/components/StatusMessage";
import { useTranslation } from "react-i18next";

const InitPage = () => {
  const { theme } = useThemeContext();
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={theme.backgroundMainGradient}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color={theme.text}
          style={styles.loader}
        />
        <StatusMessage type="info" content={[t("layout.loadingData")]} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loader: {
    marginBottom: 20,
    transform: [{ scale: 1.2 }],
  },
});

export default InitPage;
