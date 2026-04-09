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
import CreateApiKeyModal from "@/src/components/settings/security/api-keys/CreateApiKeyModal";
import ApiKeyDetailsModal from "@/src/components/settings/security/api-keys/ApiKeyDetailsModal";

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string;
  active: boolean;
}

export default function ApiKeysRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState("");

  const fetchApiKeys = async () => {
    setIsLoading(true);
    const response = await auth.apikey.list();
    if (response.success) {
      const keys = response.data.keys || response.data.apiKeys || [];
      if (keys.length === 0) {
        setApiKeys([]);
        setIsLoading(false);
        return;
      }
      const mapped = keys.map((k: any) => ({
        id: k.id.toString(),
        name: k.name,
        createdAt: k.created_at
          ? new Date(k.created_at).toLocaleDateString()
          : t("settings.security.unknown"),
        lastUsed: k.last_used_at
          ? new Date(k.last_used_at).toLocaleDateString()
          : t("settings.security.never"),
        active: k.active ?? true,
      }));
      setApiKeys(mapped);
    } else {
      setError(response.error || t("settings.security.failedToLoadApiKeys"));
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreateKey = async (name: string) => {
    setIsLoading(true);
    const response = await auth.apikey.create(name);
    if (response.success) {
      setSuccess(t("settings.security.apiKeyCreatedSuccess"));
      setShowCreateModal(false);
      fetchApiKeys();

      if (response.data.apiKey) {
        setNewlyCreatedKey(response.data.apiKey);
        setShowDetailsModal(true);
      }
    } else {
      setError(response.error || t("settings.security.apiKeyCreatedFailed"));
    }
    setIsLoading(false);
  };

  const handleToggleKey = async (id: string, active: boolean) => {
    const response = await auth.apikey.toggleActive(parseInt(id), active);
    if (response.success) {
      setSuccess(
        active ? t("settings.security.apiKeyActivatedSuccess") : t("settings.security.apiKeyDeactivatedSuccess"),
      );
      fetchApiKeys();
    } else {
      setError(response.error || t("settings.security.apiKeyStatusUpdateFailed"));
    }
  };

  const handleDeleteKey = async (id: string) => {
    const response = await auth.apikey.revoke(parseInt(id));
    if (response.success) {
      setSuccess(t("settings.security.apiKeyRevokedSuccess"));
      fetchApiKeys();
    } else {
      setError(response.error || t("settings.security.apiKeyRevokeFailed"));
    }
  };

  return (
    <>
      <HeaderWithBackArrow translationKey="settings.security.apiKeys" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <AppText style={styles.title} translationKey="settings.security.apiKeys" />
          <AppText style={styles.subtitle} translationKey="settings.security.manageApiKeys" />
        </View>

        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.listContainer}>
          {apiKeys.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="Key01Icon" color="#a0a0a0" size={48} />
              <AppText style={styles.emptyText} translationKey="settings.security.noApiKeys" />
              <AppText style={styles.emptySubtext} translationKey="settings.security.createApiKeyPrompt" />
            </View>
          ) : (
            apiKeys.map((apiKey) => (
              <SecurityListCard
                key={apiKey.id}
                iconName="Key01Icon"
                iconColor={apiKey.active ? "#6366f1" : "#a0a0a0"}
                title={apiKey.name}
                subtitle={`${t("settings.security.created")} ${apiKey.createdAt} · ${t("settings.security.lastUsed")} ${apiKey.lastUsed}`}
                active={apiKey.active}
                onToggle={(active: boolean) =>
                  handleToggleKey(apiKey.id, active)
                }
                onDelete={() => handleDeleteKey(apiKey.id)}
              />
            ))
          )}
        </View>

        <View style={styles.addButtonContainer}>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={({ pressed, hovered }: any) => [
              styles.addButton,
              hovered && styles.addButtonHovered,
              pressed && styles.addButtonPressed,
            ]}
          >
            <Icon name="PlusSignCircleIcon" color="#fff" />
            <AppText style={styles.addButtonText} translationKey="settings.security.createNewApiKey" />
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

      <CreateApiKeyModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateKey}
        isLoading={isLoading}
        theme={theme}
      />

      <ApiKeyDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        apiKey={newlyCreatedKey}
        theme={theme}
      />
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
