import React, { useContext, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Button from "@/src/components/ui/button/Button";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Icon from "@/src/components/ui/icon/Icon";

interface MfaMethod {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isActive: boolean;
}

export default function MfaRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // Mock data, temporary
  const [methods, setMethods] = useState<MfaMethod[]>([
    {
      id: "authenticator",
      name: t("settings.privacyAndSecurity.authenticator"),
      description: t("settings.privacyAndSecurity.authAppDesc"),
      iconName: "Shield01Icon",
      isActive: true,
    },
    {
      id: "email",
      name: t("settings.privacyAndSecurity.email"),
      description: t("settings.privacyAndSecurity.emailCodeDesc"),
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
      prev.map((m) => (m.id === methodId ? { ...m, isActive: true } : m)),
    );
    setSuccess(t("settings.privacyAndSecurity.mfaMethodAdded"));
  };

  const handleRemoveMethod = (methodId: string) => {
    // TODO: API call to remove method
    console.log("Remove MFA method", methodId);
    setMethods((prev) =>
      prev.map((m) => (m.id === methodId ? { ...m, isActive: false } : m)),
    );
    setSuccess(t("settings.privacyAndSecurity.mfaMethodRemoved"));
  };

  const handleShowBackupCodes = () => {
    // TODO: show backup codes modal
    console.log("Show backup codes");
  };

  const handleResetBackupCodes = () => {
    // TODO: API call
    console.log("Reset backup codes");
    setSuccess(t("settings.privacyAndSecurity.backupCodesResetSuccess"));
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.privacyAndSecurity.mfa"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Typography
            style={styles.title}
            translationKey="settings.privacyAndSecurity.mfaTitle"
          />
          <Typography
            style={styles.subtitle}
            translationKey="settings.privacyAndSecurity.manageAuthMethods"
          />
        </View>

        <StatusMessage
          type="danger"
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
                    <Icon name={method.iconName} />
                  </View>
                  <View style={styles.methodDetails}>
                    <Typography style={styles.methodName} text={method.name} />
                    <Typography
                      style={styles.methodDescription}
                      text={method.description}
                    />
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  {method.isActive ? (
                    <View style={styles.activeSection}>
                      <View style={styles.statusBadge}>
                        <Typography
                          style={styles.statusText}
                          translationKey="settings.privacyAndSecurity.active"
                        />
                      </View>
                      <Pressable
                        onPress={() => handleRemoveMethod(method.id)}
                        style={({ pressed, hovered }: any) => [
                          styles.deleteButton,
                          hovered && styles.deleteButtonHovered,
                          pressed && styles.deleteButtonPressed,
                        ]}
                      >
                        <Icon name="Delete02Icon" />
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
                      <Icon name="PlusSign" />
                      <Typography
                        style={styles.addButtonText}
                        translationKey="settings.privacyAndSecurity.add"
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            translationKey="settings.privacyAndSecurity.showBackupCodes"
            onPress={handleShowBackupCodes}
          />
          <Button
            translationKey="settings.privacyAndSecurity.resetBackupCodes"
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
      color: theme.subtitle,
      lineHeight: 22,
    },
    methodsContainer: {
      width: "100%",
      maxWidth: 600,
      alignSelf: "center",
    },
    methodCard: {
      backgroundColor: theme.backgroundMain,
      borderRadius: 16,
      marginBottom: 16,
      padding: 20,
      elevation: 2,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    methodCardActive: {
      borderColor: theme.backgroundSuccess,
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
      backgroundColor: theme.primary,
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
      color: theme.subtitle,
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
      backgroundColor: theme.backgroundSuccess,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      color: theme.successText,
      fontSize: 12,
      fontWeight: "600",
    },
    deleteButton: {
      backgroundColor: theme.backgroundError,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    deleteButtonHovered: {
      backgroundColor: theme.backgroundDanger,
      cursor: "pointer" as any,
    },
    deleteButtonPressed: {
      backgroundColor: theme.backgroundDanger,
      opacity: 0.9,
    },
    addButton: {
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      gap: 8,
    },
    addButtonText: {
      color: theme.text,
      fontSize: 14,
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
    buttonContainer: {
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 50,
      maxWidth: 300,
      gap: 10,
      alignSelf: "center",
    },
  });
