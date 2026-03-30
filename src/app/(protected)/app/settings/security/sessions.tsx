import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsButton from "@/src/components/settings/SettingsButton";
import StatusMessage from "@/src/components/StatusMessage";
import SecurityListCard from "@/src/components/settings/security/SecurityListCard";

import auth from "@/src/utils/backend-services/auth";

interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile";
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SessionsRoute() {
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
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return `Yesterday`;
      return date.toLocaleDateString();
    } catch (e) {
      return "Unknown";
    }
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    const response = await auth.settings.session.list();
    if (response.success) {
      const mapped = response.data.map((s: any) => ({
        id: s.id,
        device: s.userAgent || "Unknown Device",
        deviceType: s.platform === "mobile" ? "mobile" : "desktop",
        ip: s.ipAddress || "Unknown",
        lastActive: formatLastActive(s.createdAt),
        isCurrent: s.isCurrent,
      }));
      setSessions(mapped);
    } else {
      setError(response.error || "Failed to load sessions");
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchSessions();
  }, []);

  const handleDisconnect = async (id: number) => {
    const response = await auth.settings.session.revoke(id);
    if (response.success) {
      setSuccess("Session disconnected");
      fetchSessions();
    } else {
      setError(response.error || "Failed to disconnect session");
    }
  };

  const handleDisconnectAll = async () => {
    const response = await auth.settings.session.revokeOther();
    if (response.success) {
      setSuccess("All other sessions disconnected");
      fetchSessions();
    } else {
      setError(response.error || "Failed to disconnect other sessions");
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      <HeaderWithBackArrow title="Sessions" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Active Sessions</Text>
          <Text style={styles.subtitle}>
            Manage your active sessions across devices
          </Text>
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
              iconColor={session.isCurrent ? "#00C851" : "#6366f1"}
              title={session.device}
              subtitle={`${session.ip} · ${session.lastActive}`}
              badge={session.isCurrent ? "Current" : undefined}
              badgeColor="#00C851"
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
              <Text style={styles.disconnectAllText}>
                Disconnect All Other Sessions ({otherSessionsCount})
              </Text>
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
      color: "#a0a0a0",
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
      backgroundColor: "#FF4757",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 24,
    },
    disconnectAllButtonHovered: {
      backgroundColor: "#e8414f",
      cursor: "pointer" as any,
    },
    disconnectAllButtonPressed: {
      backgroundColor: "#d13a47",
      opacity: 0.9,
    },
    disconnectAllText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
  });
