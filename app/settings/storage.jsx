import React, { useContext } from "react";
import { StyleSheet, View, Text } from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import DatabaseSizeChart from "../components/DatabaseSizeChart";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <HeaderWithBackArrow goBackTo="./" />
        
        <View style={styles.wipContainer}>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>This feature is under development</Text>
        </View>
        
        {//<DatabaseSizeChart />
        } {/* Uncomment this line when DatabaseSizeChart is ready, cioè quando rifaremo il db, cioè tra la 0.8 e la 0.9 */}

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
    wipContainer: {
      backgroundColor: theme.cardBackground || "#23232b",
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
    wipSubtext: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 14,
      fontStyle: "italic",
    },
  });

export default StoragePage;