import React, { useContext, useState } from "react";
import { StyleSheet, Text, View, TextInput } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import gateway from "../../utils/backend-services/api-gateway";
import StatusMessage from "@/app/components/StatusMessage";
import SettingsButton from "@/app/components/settings/SettingsButton";
import SettingsPageScrollview from "@/app/components/settings/SettingsPageScrollview";
import SettingsCard from "@/app/components/settings/SettingsCard";

const ChangePassword = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[^\s]{8,128}$/;
  const isPasswordValid = (pwd) => passwordRegex.test(pwd);

  const handleChangePassword = async () => {
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setError(
        "Password must be 8-128 chars, include upper/lowercase, a number and a special character (@, $, !, %, *, ?, &)"
      );
      return;
    }

    try {
      setIsLoading(true);
      const success = await gateway.auth.changePassword(
        oldPassword,
        newPassword
      );
      if (success) {
        // Clear fields after success
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
      } else {
        setError("Failed to change password. Please try again.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setError(
        error.response?.data?.message ||
          "An error occurred while changing password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="./" />
      <SettingsPageScrollview>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>
          Enter your current password and choose a new one
        </Text>

        <SettingsCard>
          <StatusMessage type="error" text={error} />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={theme.placeholder}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={theme.placeholder}
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
              placeholderTextColor={theme.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <SettingsButton
            onPress={handleChangePassword}
            text={isLoading ? "Changing Password..." : "Change Password"}
            style={[isLoading && styles.disabledButton]}
            textStyle={styles.buttonText}
            disabled={isLoading}
          />

          <View style={styles.securityNote}>
            <Text style={styles.noteText}>
              • Password must be 8-128 characters long{"\n"}• Must include
              uppercase and lowercase letters{"\n"}• Must include at least one
              number{"\n"}• Must include at least one special character (@, $,
              !, %, *, ?, &){"\n"}• Don't reuse old passwords
            </Text>
          </View>
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      color: theme.subtitle,
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
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
    disabledButton: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    securityNote: {
      backgroundColor: theme.backgroundSettingsCards,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      marginTop: 24,
    },
    noteText: {
      color: theme.subtitle,
      fontSize: 14,
      lineHeight: 20,
    },
  });

export default ChangePassword;
