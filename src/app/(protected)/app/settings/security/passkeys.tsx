import React, { useContext, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        name: p.name || t("settings.security.unnamedPasskey"),
        createdAt: p.created_at
          ? new Date(p.created_at).toLocaleDateString()
          : t("settings.security.unknown"),
      }));
      setPasskeys(mapped);
    } else {
      setError(response.error || t("settings.security.failedToLoadPasskeys"));
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
      setSuccess(t("settings.security.passkeyAddedSuccess"));
      fetchPasskeys();
    } else {
      setError(response.error || t("settings.security.passkeyAddedFailed"));
    }
    setIsLoading(false);
  };

  const handleDeletePasskey = async (id: string) => {
    const response = await auth.settings.passkey.remove(id);
    if (response.success) {
      setSuccess(t("settings.security.passkeyRemovedSuccess"));
      fetchPasskeys();
    } else {
      setError(response.error || t("settings.security.passkeyRemovedFailed"));
    }
  };

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.security.passkeys" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <AppText style={styles.title} translationKey="settings.security.passkeys" />
          <AppText style={styles.subtitle} translationKey="settings.security.managePasskeys" />
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
              <AppText style={styles.emptyText} translationKey="settings.security.noPasskeys" />
              <AppText style={styles.emptySubtext} translationKey="settings.security.addPasskeyPrompt" />
            </View>
          ) : (
            passkeys.map((passkey) => (
              <SecurityListCard
                key={passkey.id}
                iconName="FingerPrintIcon"
                iconColor="#6366f1"
                title={passkey.name}
                subtitle={`${t("settings.security.added")} ${passkey.createdAt}`}
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
            <AppText style={styles.addButtonText} translationKey="settings.security.addPasskey" />
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
