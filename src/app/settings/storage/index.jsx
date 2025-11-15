import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenLayout from "@/src/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import { useRouter } from "expo-router";
import auth from "@/src/utils/welcome/auth";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

const StoragePage = () => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const styles = createStyle(theme);

  const handleResetDatabase = () => {
    auth.initializeApp();
  };

  const handleNavigateToLocal = () => {
    router.push("./storage/local-storage");
  };

  const handleNavigateToCloud = () => {
    router.push("./storage/cloud-storage");
  };

  const localData = {
    title: "Local Storage",
    totalUsed: 2.3,
    totalCapacity: null,
  };

  const cloudData = {
    title: "Cloud Storage",
    totalUsed: 10,
    totalCapacity: 15,
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo={"../"}/>
      <SettingsPageScrollview>
        <SettingsCard>
          <Text style={styles.wipText}>🚧 Work in Progress 🚧</Text>
          <Text style={styles.wipSubtext}>
            This feature is under development
          </Text>
        </SettingsCard>
        <SettingsCard style={{ padding: 0 }}>
          <HoverAndPressedButton
            style={styles.storagePressable}
            onPress={handleNavigateToLocal}
          >
            <Text style={styles.storageTitle}>{localData.title}</Text>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Text style={styles.storageUsage}>
                {localData.totalUsed} GB used
              </Text>
              <Icon name={"ArrowRight02Icon"} />
            </View>
          </HoverAndPressedButton>
        </SettingsCard>

        <SettingsCard style={{ padding: 0 }}>
          <HoverAndPressedButton
            style={styles.storagePressable}
            onPress={handleNavigateToCloud}
          >
            <Text style={styles.storageTitle}>{cloudData.title}</Text>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Text style={styles.storageUsage}>
                {cloudData.totalUsed} / {cloudData.totalCapacity} GB
              </Text>
              <Icon name={"ArrowRight02Icon"} />
            </View>
          </HoverAndPressedButton>
        </SettingsCard>
        <SettingsCard>
          <HoverAndPressedButton
            style={styles.resetButton}
            onPress={handleResetDatabase}
          >
            <Text style={styles.resetButtonText}>Reset Database</Text>
          </HoverAndPressedButton>
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    wipContainer: {
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
      color: theme.text,
      fontSize: 14,
      fontStyle: "italic",
    },
    storagePressable: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 24,
      borderRadius: 0
    },
    storageTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    storageUsage: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
  });

export default StoragePage;
