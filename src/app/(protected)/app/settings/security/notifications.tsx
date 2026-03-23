import React, { useContext, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";
import Icon from "@/src/components/Icon";

interface NotificationMethod {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
}

export default function NotificationsRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Mock data
  const [methods, setMethods] = useState<NotificationMethod[]>([
    {
      id: "1",
      name: "Novyse",
      type: "In-app notifications",
      isDefault: true,
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const handleAddMethod = () => {
    // TODO: open add notification method flow
    console.log("Add notification method");
  };

  const handleDeleteMethod = (id: string) => {
    // TODO: API call
    console.log("Delete notification method", id);
    setMethods((prev) => prev.filter((m) => m.id !== id));
    setSuccess("Notification method removed");
  };

  return (
    <>
      <HeaderWithBackArrow title="Notifications" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Notification Methods</Text>
          <Text style={styles.subtitle}>
            Manage how you receive security notifications
          </Text>
        </View>

        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.listContainer}>
          {methods.map((method) => (
            <SecurityListCard
              key={method.id}
              iconName="Notification03Icon"
              iconColor={method.isDefault ? "#00C851" : "#6366f1"}
              title={method.name}
              subtitle={method.type}
              badge={method.isDefault ? "Default" : undefined}
              badgeColor="#6366f1"
              isHighlighted={method.isDefault}
              onDelete={
                !method.isDefault
                  ? () => handleDeleteMethod(method.id)
                  : undefined
              }
            />
          ))}
        </View>

        <View style={styles.addButtonContainer}>
          <Pressable
            onPress={handleAddMethod}
            style={({ pressed, hovered }: any) => [
              styles.addButton,
              hovered && styles.addButtonHovered,
              pressed && styles.addButtonPressed,
            ]}
          >
            <Icon name="PlusSignCircleIcon" color="#fff" />
            <Text style={styles.addButtonText}>Add Notification Method</Text>
          </Pressable>
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
    listContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    addButtonContainer: {
      alignItems: "center",
      marginTop: 8,
    },
    addButton: {
      backgroundColor: "#6366f1",
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 24,
      gap: 10,
    },
    addButtonText: {
      color: "#fff",
      fontSize: 16,
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
  });
