import React, { useContext, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsButton from "@/src/components/settings/SettingsButton";
import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";

interface MfaMethod {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isActive: boolean;
}

export default function MfaRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Mock data, temporary
  const [methods, setMethods] = useState<MfaMethod[]>([
    {
      id: "authenticator",
      name: "Authenticator",
      description: "Authentication App",
      iconName: "SecurityIcon",
      isActive: true,
    },
    {
      id: "email",
      name: "Email",
      description: "Code via Email",
      iconName: "Mail01Icon",
      isActive: false,
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const handleAddMethod = (methodId: string) => {
    // TODO: API call to add method
    console.log("Add MFA method", methodId);
    setMethods((prev) =>
      prev.map((m) => (m.id === methodId ? { ...m, isActive: true } : m))
    );
    setSuccess("MFA method added successfully");
  };

  const handleRemoveMethod = (methodId: string) => {
    // TODO: API call to remove method
    console.log("Remove MFA method", methodId);
    setMethods((prev) =>
      prev.map((m) => (m.id === methodId ? { ...m, isActive: false } : m))
    );
    setSuccess("MFA method removed successfully");
  };

  const handleShowBackupCodes = () => {
    // TODO: show backup codes modal
    console.log("Show backup codes");
  };

  const handleResetBackupCodes = () => {
    // TODO: API call
    console.log("Reset backup codes");
    setSuccess("Backup codes have been reset successfully");
  };

  return (
    <>
      <HeaderWithBackArrow title="MFA" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Multi-Factor Authentication</Text>
          <Text style={styles.subtitle}>
            Manage your authentication methods
          </Text>
        </View>

        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.methodsContainer}>
          {methods.map((method) => (
            <View
              key={method.id}
              style={[
                styles.methodCard,
                method.isActive && styles.methodCardActive,
              ]}
            >
              <View style={styles.methodHeader}>
                <View style={styles.methodInfo}>
                  <View style={styles.iconContainer}>
                    <Icon name={method.iconName} color="#fff" />
                  </View>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>
                      {method.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  {method.isActive ? (
                    <View style={styles.activeSection}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Active</Text>
                      </View>
                      <Pressable
                        onPress={() => handleRemoveMethod(method.id)}
                        style={({ pressed, hovered }: any) => [
                          styles.deleteButton,
                          hovered && styles.deleteButtonHovered,
                          pressed && styles.deleteButtonPressed,
                        ]}
                      >
                        <Icon name="Delete02Icon" color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleAddMethod(method.id)}
                      style={({ pressed, hovered }: any) => [
                        styles.addButton,
                        hovered && styles.addButtonHovered,
                        pressed && styles.addButtonPressed,
                      ]}
                    >
                      <Icon name="PlusSignCircleIcon" color="#fff" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <SettingsButton
            text="Show Backup Codes"
            onPress={handleShowBackupCodes}
          />
          <SettingsButton
            text="Reset Backup Codes"
            onPress={handleResetBackupCodes}
          />
        </View>

        <StatusMessage
          type="success"
          content={[success]}
          visible={!!success}
          timeout={3000}
          onClose={() => setSuccess("")}
        />
      </SettingsPageScrollview>
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    headerSection: {
      marginBottom: 32,
      paddingTop: 20,
      alignItems: "center",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: "#a0a0a0",
      lineHeight: 22,
    },
    methodsContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    methodCard: {
      backgroundColor: theme.backgroundSettingsCards,
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    methodCardActive: {
      borderColor: "#00C851",
    },
    methodHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    methodInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#6366f1",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    methodDetails: {
      flex: 1,
    },
    methodName: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    methodDescription: {
      fontSize: 14,
      color: "#a0a0a0",
    },
    actionContainer: {
      alignItems: "center",
    },
    activeSection: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    statusBadge: {
      backgroundColor: "#00C851",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    deleteButton: {
      backgroundColor: "#FF4757",
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButtonHovered: {
      backgroundColor: "#e8414f",
      cursor: "pointer" as any,
    },
    deleteButtonPressed: {
      backgroundColor: "#d13a47",
      opacity: 0.9,
    },
    addButton: {
      backgroundColor: "#6366f1",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
    },
    addButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    addButtonHovered: {
      backgroundColor: "#5558e6",
      cursor: "pointer" as any,
    },
    addButtonPressed: {
      backgroundColor: "#4e51d4",
      opacity: 0.9,
    },
    buttonContainer: {
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 50,
      maxWidth: 300,
      gap: 10,
      alignSelf: "center",
    },
  });
