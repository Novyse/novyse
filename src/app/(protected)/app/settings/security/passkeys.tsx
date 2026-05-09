import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";
import Section from "@/src/components/settings/Section";
import SettingRow from "@/src/components/settings/SettingRow";
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
        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <Section titleKey="settings.security.actions" style={{ marginTop: 20 }}>
          <SettingRow
            iconName="PlusSignIcon"
            labelKey="settings.security.addPasskey"
            onPress={handleAddPasskey}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        <Section titleKey="settings.security.managePasskeys">
          <View style={styles.listContainer}>
            {passkeys.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="FingerPrintIcon" size={48} />
                <AppText style={styles.emptyText} translationKey="settings.security.noPasskeys" />
                <AppText style={styles.emptySubtext} translationKey="settings.security.addPasskeyPrompt" />
              </View>
            ) : (
              passkeys.map((passkey) => (
                <SecurityListCard
                  key={passkey.id}
                  iconName="FingerPrintIcon"
                  title={passkey.name}
                  subtitle={`${t("settings.security.added")} ${passkey.createdAt}`}
                  onDelete={() => handleDeletePasskey(passkey.id)}
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
