import React, { useContext, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import AppText from "@/src/components/ui/text/AppText";

import { DateTime } from "luxon";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemeContext } from "@/src/context/ThemeContext";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";
import SessionInfo from "@/src/components/settings/security/SessionInfo";

import auth from "@/src/utils/backend-services/auth";

interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile";
  ip: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SessionsRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatLastActive = (dateStr: string) => {
    try {
      const date = DateTime.fromISO(dateStr, { zone: "utc" }).toLocal();
      const now = DateTime.now();
      const diffMs = now.toMillis() - date.toMillis();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return t("settings.security.justNow");
      if (diffMins < 60) return `${diffMins}${t("settings.security.mAgo")}`;
      if (diffHours < 24) return `${diffHours}${t("settings.security.hAgo")}`;
      if (diffDays === 1) return t("settings.security.yesterday");
      return date.toFormat("MMMM d, yyyy");
    } catch (e) {
      return t("settings.security.unknown");
    }
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    const response = await auth.settings.session.list();
    if (response.success) {
      const mapped = response.data.map((s: any) => ({
        id: s.id,
        device: s.userAgent || t("settings.security.unknownDevice"),
        deviceType: s.platform === "mobile" ? "mobile" : "desktop",
        ip: s.ipAddress || t("settings.security.unknown"),
        createdAt: formatLastActive(s.createdAt),
        lastActive: formatLastActive(s.lastActiveAt),
        isCurrent: s.isCurrent,
      }));
      setSessions(mapped);
    } else {
      setError(response.error || t("settings.security.failedToLoadSessions"));
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchSessions();
  }, []);

  const handleDisconnect = async (id: number) => {
    const response = await auth.settings.session.revoke(id);
    if (response.success) {
      setSuccess(t("settings.security.sessionDisconnected"));
      fetchSessions();
    } else {
      setError(
        response.error || t("settings.security.sessionDisconnectFailed"),
      );
    }
  };

  const handleDisconnectAll = async () => {
    const response = await auth.settings.session.revokeOther();
    if (response.success) {
      setSuccess(t("settings.security.allOtherSessionsDisconnected"));
      fetchSessions();
    } else {
      setError(
        response.error ||
          t("settings.security.allOtherSessionsDisconnectFailed"),
      );
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.security.sessionsLabel"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <AppText
            style={styles.title}
            translationKey="settings.security.activeSessions"
          />
          <AppText
            style={styles.subtitle}
            translationKey="settings.security.manageSessions"
          />
        </View>

        <StatusMessage
          type="error"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.listContainer}>
          {sessions.map((session) => (
            <SecurityListCard
              key={session.id}
              iconName={
                session.deviceType === "mobile"
                  ? "SmartPhone01Icon"
                  : "ComputerIcon"
              }
              title={session.device}
              subtitle={
                <SessionInfo
                  ip={session.ip}
                  createdAt={session.createdAt}
                  lastActive={session.lastActive}
                />
              }
              badge={
                session.isCurrent ? t("settings.security.current") : undefined
              }
              isHighlighted={session.isCurrent}
              onDelete={
                !session.isCurrent
                  ? () => handleDisconnect(parseInt(session.id))
                  : undefined
              }
            />
          ))}
        </View>

        {otherSessionsCount > 0 && (
          <View style={styles.disconnectAllContainer}>
            <Pressable
              onPress={handleDisconnectAll}
              style={({ pressed, hovered }: any) => [
                styles.disconnectAllButton,
                hovered && styles.disconnectAllButtonHovered,
                pressed && styles.disconnectAllButtonPressed,
              ]}
            >
              <AppText
                style={styles.disconnectAllText}
                text={`${t("settings.security.disconnectAllOtherSessions")} (${otherSessionsCount})`}
              />
            </Pressable>
          </View>
        )}

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
      color: theme.subtitle,
      lineHeight: 22,
    },
    listContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    disconnectAllContainer: {
      alignItems: "center",
      marginTop: 8,
    },
    disconnectAllButton: {
      backgroundColor: theme.iconDanger,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 24,
    },
    disconnectAllButtonHovered: {
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer" as any,
    },
    disconnectAllButtonPressed: {
      backgroundColor: theme.settingsPressedButton,
      opacity: 0.9,
    },
    disconnectAllText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });
