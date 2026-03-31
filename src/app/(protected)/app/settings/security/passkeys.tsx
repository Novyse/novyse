import React, { useContext, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";
import Icon from "@/src/components/Icon";
import auth from "@/src/utils/backend-services/auth";

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
}

export default function PasskeysRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPasskeys = async () => {
    setIsLoading(true);
    const response = await auth.settings.passkey.list();
    if (response.success) {
      const passkeysData = response.data.passkeys || [];
      const mapped = passkeysData.map((p: any) => ({
        id: p.id,
        name: p.name || "Unnamed Passkey",
        createdAt: p.created_at
          ? new Date(p.created_at).toLocaleDateString()
          : "Unknown",
      }));
      setPasskeys(mapped);
    } else {
      setError(response.error || "Failed to load passkeys");
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleAddPasskey = async () => {
    setIsLoading(true);
    const response = await auth.settings.passkey.add();
    if (response.success) {
      setSuccess("Passkey added successfully");
      fetchPasskeys();
    } else {
      setError(response.error || "Failed to add passkey");
    }
    setIsLoading(false);
  };

  const handleDeletePasskey = async (id: string) => {
    const response = await auth.settings.passkey.remove(id);
    if (response.success) {
      setSuccess("Passkey removed successfully");
      fetchPasskeys();
    } else {
      setError(response.error || "Failed to remove passkey");
    }
  };

  return (
    <>
      <HeaderWithBackArrow title="Passkeys" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Passkeys</Text>
          <Text style={styles.subtitle}>
            Manage your registered passkeys for passwordless login
          </Text>
        </View>

        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.listContainer}>
          {passkeys.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="FingerPrintIcon" color="#a0a0a0" size={48} />
              <Text style={styles.emptyText}>No passkeys registered</Text>
              <Text style={styles.emptySubtext}>
                Add a passkey for a faster and more secure login
              </Text>
            </View>
          ) : (
            passkeys.map((passkey) => (
              <SecurityListCard
                key={passkey.id}
                iconName="FingerPrintIcon"
                iconColor="#6366f1"
                title={passkey.name}
                subtitle={`Added ${passkey.createdAt}`}
                onDelete={() => handleDeletePasskey(passkey.id)}
              />
            ))
          )}
        </View>

        <View style={styles.addButtonContainer}>
          <Pressable
            onPress={handleAddPasskey}
            style={({ pressed, hovered }: any) => [
              styles.addButton,
              hovered && styles.addButtonHovered,
              pressed && styles.addButtonPressed,
            ]}
          >
            <Icon name="PlusSignCircleIcon" color="#fff" />
            <Text style={styles.addButtonText}>Add Passkey</Text>
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
      textAlign: "center",
    },
    listContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: "#a0a0a0",
      textAlign: "center",
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
