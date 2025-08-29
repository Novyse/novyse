import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import APIMethods from "../../utils/APImethods";
import StatusMessage from "@/app/components/StatusMessage";
import SettingsButton from "@/app/components/settings/SettingsButton";

const ChangePassword = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Fixed typo in initialization
  const [error, setError] = useState("");

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[$#@!?])[^\s]{8,32}$/;
  const isPasswordValid = (pwd) => passwordRegex.test(pwd);

  const handleChangePassword = async () => {
    setError(""); // Reset error state

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
        "Password must be 8-32 chars, include upper/lowercase, a number and a special character ($ # @ ! ?)"
      );
      return;
    }

    try {
      setIsLoading(true);
      const changePassword = await APIMethods.changePassword(
        oldPassword,
        newPassword
      );
      // Clear fields after success
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            Enter your current password and choose a new one
          </Text>

          <View style={styles.formContainer}>
            <StatusMessage type="error" text={error} />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={theme.placeholder || "#888"}
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
                placeholderTextColor={theme.placeholder || "#888"}
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
                placeholderTextColor={theme.placeholder || "#888"}
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
                • Password must be 8-32 characters long{"\n"}• Must include
                uppercase and lowercase letters{"\n"}• Must include at least one
                number{"\n"}• Must include at least one special character ($ # @
                ! ?){"\n"}• Don't reuse old passwords
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignSelf: "center",
      width: "100%",
      maxWidth: 768,
    },
    content: {
      paddingTop: 20,
      paddingBottom: 40,
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 22,
    },
    formContainer: {
      backgroundColor: theme.backgroundSettingsCards || "#23232b",
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
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
      backgroundColor: theme.inputBackground || "#1a1d29",
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.borderColor || "#333",
    },
    disabledButton: {
      opacity: 0.6,
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "600",
    },
    securityNote: {
      backgroundColor: theme.backgroundSettingsCards || "#23232b",
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary || "#4f8cff",
      marginTop: 24,
    },
    noteText: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 14,
      lineHeight: 20,
    },
  });

export default ChangePassword;
