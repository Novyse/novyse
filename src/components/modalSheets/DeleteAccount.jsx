import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";

import { useRouter } from "expo-router";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import ModalBase from "@/src/components/modalSheets/ModalBase";
import StatusMessage from "@/src/components/StatusMessage";

import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";
import { useAuth } from "@/context/AuthContext";

import gateway from "@/src/utils/backend-services/api-gateway";
import auth from "@/src/utils/welcome/auth";

const DeleteAccount = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const router = useRouter();
  const { refreshLoginStatus } = useAuth();

  const { username } = useContext(LocalUserContext);

  const [inputUsername, setInputUsername] = useState("");
  const [error, setError] = useState(null);

  const isMatch = inputUsername === username;

  const handleClose = () => {
    setInputUsername("");
    if (onClose) onClose();
  };

  const onConfirm = () => {
    if (isMatch && handleButtonPress) {
      handleButtonPress();
    }
  };

  const handleButtonPress = async () => {
    const response = await gateway.user.delete();
    if (response.success) {
      await auth.logout();
      await refreshLoginStatus();
      router.navigate("/welcome?deleteAccount=true");
    } else {
      setError("Something went wrong. Please try again later.");
    }
  };

  return (
    <ModalBase
      visible={visible}
      onClose={handleClose}
      theme={theme}
      hideCloseX={true}
    >
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              Warning: All your user data will be permanently deleted. This
              action cannot be reversed.
            </Text>
          </View>
        </View>

        {/* Confirmation Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel} selectable={false}>
            CONFIRMATION IDENTITY
          </Text>
          <Text style={styles.inputLabel} selectable={false}>
            Please type{" "}
            <Text style={styles.boldUsername} selectable={true}>
              {username}
            </Text>{" "}
            to confirm.
          </Text>
          <TextInput
            style={styles.input}
            value={inputUsername}
            onChangeText={setInputUsername}
            placeholder="Enter your username"
            placeholderTextColor={theme.placeholderText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            You will be logged out and your data will instantly be queued for
            deletion.
          </Text>
        </View>

        <StatusMessage
          visible={error}
          onClose={() => setError(null)}
          content={[error]}
          type="error"
        />

        {/* Footer */}
        <View style={styles.footer}>
          <HoverAndPressedButton onPress={handleClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText} selectable={false}>
              Cancel
            </Text>
          </HoverAndPressedButton>
          <HoverAndPressedButton
            style={[styles.createBtn, !isMatch && styles.createBtnDisabled]}
            disabled={!isMatch}
            onPress={onConfirm}
          >
            <Icon name="Delete02Icon" size={18} color="#FFF" />
            <Text style={styles.createBtnText} selectable={false}>
              Delete
            </Text>
          </HoverAndPressedButton>
        </View>
      </View>
    </ModalBase>
  );
};

const createStyles = (theme) => {
  return StyleSheet.create({
    contentContainer: {
      padding: 20,
    },
    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FF3B30",
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.placeholderText,
      lineHeight: 20,
    },
    // Sections
    section: {
      marginTop: 24,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.iconSecondary,
      letterSpacing: 1,
      marginBottom: 12,
      textTransform: "uppercase",
    },
    inputLabel: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 8,
    },
    boldUsername: {
      fontWeight: "700",
      color: theme.text,
      userSelect: "all",
    },
    input: {
      backgroundColor: theme.backgroundCard,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      outlineStyle: "none",
    },
    helperText: {
      fontSize: 12,
      color: theme.placeholderText,
      marginTop: 6,
    },
    // Footer
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingTop: 16,
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: theme.backgroundCard,
    },
    cancelBtn: {
      marginRight: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    cancelBtnText: {
      color: theme.iconSecondary,
      fontSize: 15,
      fontWeight: "500",
    },
    createBtn: {
      backgroundColor: "#FF3B30",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    createBtnDisabled: {
      backgroundColor: "rgba(255, 59, 48, 0.4)",
    },
    createBtnText: {
      color: "#FFF",
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 4,
    },
  });
};

export default DeleteAccount;
