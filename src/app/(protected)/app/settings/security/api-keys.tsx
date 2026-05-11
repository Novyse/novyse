import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";
import Section from "@/src/components/settings/Section";
import SettingRow from "@/src/components/settings/SettingRow";
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
        active
          ? t("settings.security.apiKeyActivatedSuccess")
          : t("settings.security.apiKeyDeactivatedSuccess"),
      );
      fetchApiKeys();
    } else {
      setError(
        response.error || t("settings.security.apiKeyStatusUpdateFailed"),
      );
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
      <HeaderWithBackArrow
        translationKey="settings.security.apiKeys"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <Section titleKey="settings.security.actions" style={{ marginTop: 20 }}>
          <SettingRow
            iconName="PlusSignIcon"
            labelKey="settings.security.createNewApiKey"
            onPress={() => setShowCreateModal(true)}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        <Section titleKey="settings.security.manageApiKeys">
          <View style={styles.listContainer}>
            {apiKeys.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="Key01Icon" size={48} />
                <AppText
                  style={styles.emptyText}
                  translationKey="settings.security.noApiKeys"
                />
                <AppText
                  style={styles.emptySubtext}
                  translationKey="settings.security.createApiKeyPrompt"
                />
              </View>
            ) : (
              apiKeys.map((apiKey) => (
                <SecurityListCard
                  key={apiKey.id}
                  iconName="Key01Icon"
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
        </Section>

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
    listContainer: {
      width: "100%",
      padding: 16,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 12,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.subtitle,
      textAlign: "center",
    },
  });
