import React, { useContext } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import DatabaseSizeChart from "../components/DatabaseSizeChart";
import auth from "../utils/welcome/auth";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleResetDatabase = () => {
    auth.initializeApp();
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <View style={styles.container}>
        <View style={styles.wipContainer}>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>
            This feature is under development
          </Text>
        </View>
        <Pressable style={styles.resetButton} onPress={handleResetDatabase}>
          <Text style={styles.resetButtonText}>Reset Database</Text>
        </Pressable>
        {
          //<DatabaseSizeChart />
        }
        {/* Uncomment this line when DatabaseSizeChart is ready, cioè quando rifaremo il db, cioè tra la 0.8 e la 0.9 */}
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
    wipContainer: {
      backgroundColor: theme.backgroundCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: "#FFA500",
      alignItems: "center",
    },
    wipText: {
      color: "#FFA500",
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 5,
    },
    resetButton: {
      backgroundColor: "#FF0000",
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 20,
    },
    resetButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    wipSubtext: {
      color: theme.subtitle,
      fontSize: 14,
      fontStyle: "italic",
    },
  });

export default StoragePage;
