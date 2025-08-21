import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Pressable, Text, View, TextInput, ScrollView } from "react-native";
import ScreenLayout from "@/app/components/ScreenLayout";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../../components/HeaderWithBackArrow";
import APIMethods from "../../utils/APImethods";

const ChangePassword = () => {
  const { setColorScheme, theme, colorScheme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {

    // TODO
    /*

      - togliere alert, che skif
      - metti i veri parametri necessari per dichiarare che una pass è valida che sicuramente non è >6 la lenght e basta
    */

      const showAlert = (title, message) => {
      if (typeof window !== 'undefined') {
        window.alert(`${title}: ${message}`);
      } else {
        console.log(`${title}: ${message}`);
      }
    };

    
if (!oldPassword || !newPassword || !confirmPassword) {
      showAlert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Error", "New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("Error", "New password must be at least 6 characters long");
      return;
    }


    try {
      setIsLoading(true);
      const changePassword = await APIMethods.changePassword(
        oldPassword,
        newPassword
      );
      console.log("Change password", changePassword);
      Alert.alert("Success", "Password changed successfully");
      // Clear fields after success
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      if (error.response && error.response.data) {
        showAlert("Error", error.response.data.message || "Failed to change password");
      } else {
        showAlert("Error", "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <HeaderWithBackArrow goBackTo="./" />
        
        <View style={styles.content}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Enter your current password and choose a new one</Text>

          <View style={styles.formContainer}>
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

            <Pressable
              style={[
                styles.changePasswordButton,
                isLoading && styles.disabledButton
              ]}
              onPress={handleChangePassword}
              disabled={isLoading}
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Changing Password..." : "Change Password"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.noteText}>
              • Password must be at least 6 characters long{"\n"}
              • Use a combination of letters, numbers, and symbols{"\n"}
              • Don't reuse old passwords
            </Text>
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
      padding: 10,
    },
    content: {
      paddingTop: 20,
      paddingBottom: 40, // Added bottom padding
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
      backgroundColor: theme.cardBackground || "#23232b",
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
    changePasswordButton: {
      backgroundColor: theme.primary || "#4f8cff",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      elevation: 2, // Android shadow
      shadowColor: "#000", // iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
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
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary || "#4f8cff",
    },
    noteText: {
      color: theme.subtitle || "#b0b0b0",
      fontSize: 14,
      lineHeight: 20,
    },
  });

export default ChangePassword;