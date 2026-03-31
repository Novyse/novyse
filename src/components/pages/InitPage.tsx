import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeContext } from "@/context/ThemeContext";
import StatusMessage from "@/src/components/StatusMessage";

const InitPage = () => {
  const { theme } = useThemeContext();

  return (
    <LinearGradient
      colors={theme.backgroundMainGradient}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color={"#ffffff"}
          style={styles.loader}
        />
        <StatusMessage type="info" content={["Loading your data..."]} />
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
