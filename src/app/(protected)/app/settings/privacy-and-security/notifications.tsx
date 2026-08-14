import React, { useContext, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import SecurityListCard from "@/src/components/features/settings/privacy-and-security/security/SecurityListCard";
import Icon from "@/src/components/ui/icon/Icon";

interface NotificationMethod {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
}

export default function NotificationsRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [methods, setMethods] = useState<NotificationMethod[]>([
    {
      id: "1",
      name: "Novyse",
      type: t("settings.privacyAndSecurity.inAppNotifications"),
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
    setSuccess(t("settings.privacyAndSecurity.notificationMethodRemoved"));
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.privacyAndSecurity.notifications"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Typography
            style={styles.title}
            translationKey="settings.privacyAndSecurity.notificationMethods"
          />
          <Typography
            style={styles.subtitle}
            translationKey="settings.privacyAndSecurity.manageNotifications"
          />
        </View>

        <StatusMessage
          type="danger"
          content={[error || ""]}
          visible={!!error}
          onClose={() => setError(null)}
        />

        <View style={styles.listContainer}>
          {methods.map((method) => (
            <SecurityListCard
              key={method.id}
              iconName="Notification01Icon"
              title={method.name}
              subtitle={method.type}
              badge={
                method.isDefault ? t("settings.privacyAndSecurity.default") : undefined
              }
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
            <Icon name="PlusSignCircleIcon" />
            <Typography
              style={styles.addButtonText}
              translationKey="settings.privacyAndSecurity.addNotificationMethod"
            />
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
      color: theme.subtitle,
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
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 24,
      gap: 10,
    },
    addButtonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    addButtonHovered: {
      backgroundColor: theme.settingsHoveredButton,
      cursor: "pointer" as any,
    },
    addButtonPressed: {
      backgroundColor: theme.settingsPressedButton,
      opacity: 0.9,
    },
  });
