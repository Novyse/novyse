import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import AppText from "@/src/components/AppText";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import SettingsButton from "@/src/components/settings/SettingsButton";
import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";

import auth from "@/src/utils/backend-services/auth";

export default function PasswordRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [hasPassword, setHasPassword] = useState(false);
  const [showForm, setShowForm] = useState<"change" | "set" | "remove" | null>(
    null,
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const fetchStatus = async () => {
    setIsLoading(true);
    const response = await auth.settings.opaque.getStatus();
    if (response.success && response.data.setup !== undefined) {
      setHasPassword(response.data.setup);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowForm(null);
    setError(null);
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError(t("settings.security.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.security.passwordsDontMatch"));
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque.setup(newPassword);
      if (response.success) {
        setHasPassword(true);
        setSuccess(t("settings.security.setPasswordSuccess"));
        resetForm();
      } else {
        setError(response.error || t("settings.security.setPasswordFailed"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError(t("settings.security.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.security.newPasswordsDontMatch"));
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque.setup(newPassword);
      if (response.success) {
        setSuccess(t("settings.security.changePasswordSuccess"));
        resetForm();
      } else {
        setError(response.error || t("settings.security.changePasswordFailed"));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque.deactivate();
      if (response.success) {
        setHasPassword(false);
        setSuccess(t("settings.security.deactivatePasswordSuccess"));
        resetForm();
      } else {
        setError(
          response.error || t("settings.security.deactivatePasswordFailed"),
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.security.password"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <AppText
            style={styles.title}
            translationKey="settings.security.password"
          />
          <AppText
            style={styles.subtitle}
            translationKey="settings.security.managePassword"
          />
        </View>

        {/* Status Card */}
        <SettingsCard>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <View
                style={[
                  styles.statusIcon,
                  { backgroundColor: hasPassword ? "#00C851" : "#FF4757" },
                ]}
              >
                <Icon
                  name={hasPassword ? "CheckmarkCircle02Icon" : "Cancel01Icon"}
                  color="#fff"
                  size={20}
                />
              </View>
              <View>
                <AppText style={styles.statusTitle}>
                  {hasPassword
                    ? t("settings.security.passwordActive")
                    : t("settings.security.noPasswordSet")}
                </AppText>
                <AppText style={styles.statusSubtitle}>
                  {hasPassword
                    ? t("settings.security.passwordProtected")
                    : t("settings.security.addPasswordSecurity")}
                </AppText>
              </View>
            </View>
          </View>
        </SettingsCard>

        {/* Action Buttons */}
        {!showForm && (
          <View style={styles.buttonGroup}>
            {!hasPassword ? (
              <SettingsButton
                translationKey="settings.security.setPassword"
                onPress={() => setShowForm("set")}
              />
            ) : (
              <>
                <SettingsButton
                  translationKey="settings.security.changePassword"
                  onPress={() => setShowForm("change")}
                />
                <SettingsButton
                  translationKey="settings.security.removePassword"
                  onPress={() => setShowForm("remove")}
                />
              </>
            )}
          </View>
        )}

        {/* Set Password Form */}
        {showForm === "set" && (
          <SettingsCard>
            <AppText
              style={styles.formTitle}
              translationKey="settings.security.setPassword"
            />

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.inputContainer}>
              <AppText
                style={styles.inputLabel}
                translationKey="settings.security.newPassword"
              />
              <TextInput
                style={styles.input}
                placeholder={t("settings.security.enterNewPassword")}
                placeholderTextColor={theme.placeholderText}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <AppText
                style={styles.inputLabel}
                translationKey="settings.security.confirmPassword"
              />
              <TextInput
                style={styles.input}
                placeholder={t("settings.security.confirmNewPasswordInput")}
                placeholderTextColor={theme.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formButtons}>
              <SettingsButton
                text={
                  isLoading
                    ? t("settings.security.setting")
                    : t("settings.security.setPassword")
                }
                onPress={handleSetPassword}
                disabled={isLoading}
              />
              <SettingsButton
                translationKey="settings.security.cancel"
                onPress={resetForm}
              />
            </View>
          </SettingsCard>
        )}

        {/* Change Password Form */}
        {showForm === "change" && (
          <SettingsCard>
            <AppText
              style={styles.formTitle}
              translationKey="settings.security.changePassword"
            />

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.inputContainer}>
              <AppText
                style={styles.inputLabel}
                translationKey="settings.security.newPassword"
              />
              <TextInput
                style={styles.input}
                placeholder={t("settings.security.enterNewPassword")}
                placeholderTextColor={theme.placeholderText}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <AppText
                style={styles.inputLabel}
                translationKey="settings.security.confirmNewPassword"
              />
              <TextInput
                style={styles.input}
                placeholder={t("settings.security.confirmNewPasswordInput")}
                placeholderTextColor={theme.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formButtons}>
              <SettingsButton
                text={
                  isLoading
                    ? t("settings.security.changing")
                    : t("settings.security.changePassword")
                }
                onPress={handleChangePassword}
                disabled={isLoading}
              />
              <SettingsButton
                translationKey="settings.security.cancel"
                onPress={resetForm}
              />
            </View>

            <View style={styles.securityNote}>
              <AppText
                style={styles.noteText}
                translationKey="settings.security.passwordNote"
              />
            </View>
          </SettingsCard>
        )}

        {/* Remove Password Form */}
        {showForm === "remove" && (
          <SettingsCard>
            <AppText
              style={styles.formTitle}
              translationKey="settings.security.removePassword"
            />
            <AppText
              style={styles.warningText}
              translationKey="settings.security.removePasswordWarning"
            />

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.formButtons}>
              <SettingsButton
                text={
                  isLoading
                    ? t("settings.security.removing")
                    : t("settings.security.removePassword")
                }
                onPress={handleRemovePassword}
                disabled={isLoading}
                style={{ backgroundColor: "#FF4757" } as any}
              />
              <SettingsButton
                translationKey="settings.security.cancel"
                onPress={resetForm}
              />
            </View>
          </SettingsCard>
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
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statusInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      flex: 1,
    },
    statusIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    statusSubtitle: {
      fontSize: 14,
      color: "#a0a0a0",
    },
    buttonGroup: {
      gap: 12,
      maxWidth: 300,
      alignSelf: "center",
      width: "100%",
    },
    formTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 14,
      color: "#FF4757",
      marginBottom: 16,
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.inputBackgroun,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    formButtons: {
      gap: 10,
      marginTop: 8,
    },
    securityNote: {
      backgroundColor: theme.backgroundSettingsCards,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: "#6366f1",
      marginTop: 24,
    },
    noteText: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
  });
