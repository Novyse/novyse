import React, { useContext } from "react";
import { StyleSheet, Text, Pressable } from "react-native";
import ScreenLayout from "../components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import DatabaseSizeChart from "../components/DatabaseSizeChart";
import auth from "../utils/welcome/auth";
import SettingsPageScrollview from "../components/settings/SettingsPageScrollview";
import SettingsCard from "../components/settings/SettingsCard";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handleResetDatabase = () => {
    auth.initializeApp();
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="../" />
      <SettingsPageScrollview>
        <SettingsCard>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>
            This feature is under development
          </Text>
        </SettingsCard>
        <SettingsCard>
          <Pressable style={styles.resetButton} onPress={handleResetDatabase}>
            <Text style={styles.resetButtonText}>Reset Database</Text>
          </Pressable>
        </SettingsCard>

        {
          //<DatabaseSizeChart />
        }
        {/* Uncomment this line when DatabaseSizeChart is ready, cioè quando rifaremo il db, cioè tra la 0.8 e la 0.9 */}
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
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
