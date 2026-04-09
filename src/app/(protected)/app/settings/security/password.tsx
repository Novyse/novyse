import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import { router } from "expo-router";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import SettingsButton from "@/src/components/settings/SettingsButton";
import StatusMessage from "@/src/components/StatusMessage";
import Icon from "@/src/components/Icon";

import auth from "@/src/utils/backend-services/auth";

export default function PasswordRoute() {
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
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque.setup(newPassword);
      if (response.success) {
        setHasPassword(true);
        setSuccess("Password set successfully");
        resetForm();
      } else {
        setError(response.error || "Failed to set password");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.settings.opaque.setup(newPassword);
      if (response.success) {
        setSuccess("Password changed successfully");
        resetForm();
      } else {
        setError(response.error || "Failed to change password");
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
        setSuccess("Password deactivated successfully");
        resetForm();
      } else {
        setError(response.error || "Failed to deactivate password");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <HeaderWithBackArrow title="Password" onBack={onBack} />
      <SettingsPageScrollview>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Password</Text>
          <Text style={styles.subtitle}>Manage your account password</Text>
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
                <Text style={styles.statusTitle}>
                  {hasPassword ? "Password Active" : "No Password Set"}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {hasPassword
                    ? "Your account is protected with a password"
                    : "Add a password for additional security"}
                </Text>
              </View>
            </View>
          </View>
        </SettingsCard>

        {/* Action Buttons */}
        {!showForm && (
          <View style={styles.buttonGroup}>
            {!hasPassword ? (
              <SettingsButton
                text="Set Password"
                onPress={() => setShowForm("set")}
              />
            ) : (
              <>
                <SettingsButton
                  text="Change Password"
                  onPress={() => setShowForm("change")}
                />
                <SettingsButton
                  text="Remove Password"
                  onPress={() => setShowForm("remove")}
                />
              </>
            )}
          </View>
        )}

        {/* Set Password Form */}
        {showForm === "set" && (
          <SettingsCard>
            <Text style={styles.formTitle}>Set Password</Text>

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={theme.placeholderText}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={theme.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formButtons}>
              <SettingsButton
                text={isLoading ? "Setting..." : "Set Password"}
                onPress={handleSetPassword}
                disabled={isLoading}
              />
              <SettingsButton text="Cancel" onPress={resetForm} />
            </View>
          </SettingsCard>
        )}

        {/* Change Password Form */}
        {showForm === "change" && (
          <SettingsCard>
            <Text style={styles.formTitle}>Change Password</Text>

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={theme.placeholderText}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={theme.placeholderText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formButtons}>
              <SettingsButton
                text={isLoading ? "Changing..." : "Change Password"}
                onPress={handleChangePassword}
                disabled={isLoading}
              />
              <SettingsButton text="Cancel" onPress={resetForm} />
            </View>

            <View style={styles.securityNote}>
              <Text style={styles.noteText}>
                • Password must be 16-256 characters long •
              </Text>
            </View>
          </SettingsCard>
        )}

        {/* Remove Password Form */}
        {showForm === "remove" && (
          <SettingsCard>
            <Text style={styles.formTitle}>Remove Password</Text>
            <Text style={styles.warningText}>
              Enter your current password to confirm removal. Make sure you have
              another login method (e.g. Passkey) active.
            </Text>

            <StatusMessage
              type="error"
              content={[error || ""]}
              visible={!!error}
              onClose={() => setError(null)}
            />

            <View style={styles.formButtons}>
              <SettingsButton
                text={isLoading ? "Removing..." : "Remove Password"}
                onPress={handleRemovePassword}
                disabled={isLoading}
                style={{ backgroundColor: "#FF4757" } as any}
              />
              <SettingsButton text="Cancel" onPress={resetForm} />
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
