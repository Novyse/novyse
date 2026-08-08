import { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ThemeContext } from "@/src/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Button from "@/src/components/ui/button/Button";
import TextInput from "@/src/components/ui/input/TextInput";
import StatusMessage from "@/src/components/features/status/StatusMessage";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingsRow";
import auth from "@/src/utils/backend-services/auth";

export default function PasswordRoute() {
  const { t } = useTranslation();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [showForm, setShowForm] = useState<"change" | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setShowForm(null);
    setError(null);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError(t("settings.privacyAndSecurity.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("settings.privacyAndSecurity.newPasswordsDontMatch"));
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque(newPassword);
      if (response.success) {
        setSuccess(t("settings.privacyAndSecurity.changePasswordSuccess"));
        resetForm();
      } else {
        setError(response.error || t("settings.privacyAndSecurity.changePasswordFailed"));
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
        translationKey="settings.privacyAndSecurity.password"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section titleKey="settings.privacyAndSecurity.status" style={{ marginTop: 20 }}>
          <SettingRow
            iconName="CheckmarkCircle02Icon"
            labelKey="settings.privacyAndSecurity.passwordActive"
            valueKey="settings.privacyAndSecurity.passwordProtected"
            style={{ borderBottomWidth: 0 }}
          />
        </Section>

        {!showForm && (
          <Section titleKey="settings.privacyAndSecurity.actions">
            <SettingRow
              iconName="Edit02Icon"
              labelKey="settings.privacyAndSecurity.changePassword"
              onPress={() => setShowForm("change")}
              style={{ borderBottomWidth: 0 }}
            />
          </Section>
        )}

        {/* Set Password Form */}

        {/* Change Password Form */}
        {showForm === "change" && (
          <Section titleKey="settings.privacyAndSecurity.changePassword">
            <View style={styles.formContainer}>
              <StatusMessage
                type="error"
                content={[error || ""]}
                visible={!!error}
                onClose={() => setError(null)}
              />

              <View style={styles.inputContainer}>
                <TextInput
                  labelTranslationKey="settings.privacyAndSecurity.newPassword"
                  placeholder={t("settings.privacyAndSecurity.enterNewPassword")}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  labelTranslationKey="settings.privacyAndSecurity.confirmNewPassword"
                  placeholder={t("settings.privacyAndSecurity.confirmNewPasswordInput")}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formButtons}>
                <Button
                  text={
                    isLoading
                      ? t("settings.privacyAndSecurity.changing")
                      : t("settings.privacyAndSecurity.changePassword")
                  }
                  onPress={handleChangePassword}
                  disabled={isLoading}
                />
                <Button
                  translationKey="settings.privacyAndSecurity.cancel"
                  onPress={resetForm}
                />
              </View>

              <View style={styles.securityNote}>
                <Typography
                  style={styles.noteText}
                  translationKey="settings.privacyAndSecurity.passwordNote"
                />
              </View>
            </View>
          </Section>
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
    formContainer: {
      padding: 24,
    },
    warningText: {
      fontSize: 14,
      color: theme.dangerText,
      marginBottom: 16,
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: 20,
    },
    formButtons: {
      gap: 10,
      marginTop: 8,
    },
    securityNote: {
      backgroundColor: theme.backgroundMain,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      marginTop: 24,
    },
    noteText: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
    },
  });
