import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import auth from "@/src/utils/welcome/auth";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";

import useStorage from "@/src/hooks/settings/useStorage";

export default function StorageRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const handlePress = (navToPage: string) => {
    router.push(`/app/${navToPage}` as any);
  };

  const handleResetDatabase = () => {
    auth.initializeDatabase();
  };

  const handleNavigateToLocal = () => {
    handlePress("settings/storage/local-storage");
  };

  const handleNavigateToCloud = () => {
    handlePress("settings/storage/cloud-storage");
  };

  const { usedStorage } = useStorage();

  return (
    <>
      <HeaderWithBackArrow title={"Storage"} onBack={onBack} />
      <SettingsPageScrollview>
        <SettingsCard style={{ padding: 0, marginTop: 30 }}>
          <HoverAndPressedButton
            style={styles.storagePressable}
            onPress={handleNavigateToLocal}
          >
            <Text style={styles.storageTitle}>Local Storage</Text>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Text style={styles.storageUsage}>
                {(usedStorage / (1024 * 1024 * 1024)).toFixed(2)} GB used
              </Text>
              <Icon name={"ArrowRight02Icon"} />
            </View>
          </HoverAndPressedButton>
        </SettingsCard>

        <SettingsCard style={{ padding: 0 }}>
          <HoverAndPressedButton
            style={styles.storagePressable}
            onPress={handleNavigateToCloud}
            disabled={true}
          >
            <Text style={styles.storageTitle}>Cloud Storage (Coming Soon)</Text>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Text style={styles.storageUsage}>0 / 0 GB</Text>
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
            <Text style={styles.resetButtonSubtitle}>
              {" "}
              (This will completely clean local database and request server all
              your data)
            </Text>
          </HoverAndPressedButton>
        </SettingsCard>
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
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
    resetButtonSubtitle: {
      color: "#FFFFFF",
      fontSize: 12,
      fontStyle: "italic",
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
      borderRadius: 0,
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
