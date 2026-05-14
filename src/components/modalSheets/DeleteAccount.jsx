import React, { useContext, useState } from "react";
import { View, StyleSheet, TextInput, Linking } from "react-native";
import AppText from "@/src/components/AppText";

import { useRouter } from "expo-router";

import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Icon from "@/src/components/Icon";
import ModalBase from "@/src/components/modalSheets/ModalBase";
import StatusMessage from "@/src/components/StatusMessage";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";

import authBackend from "@/src/utils/backend-services/auth";
import auth from "@/src/utils/welcome/auth";

const DeleteAccount = ({ visible, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  const router = useRouter();

  const myUUID = useUserStore((state) => state.localUserUUID);
  const username = useUserStore((state) => state.users[myUUID]?.handle);

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
    const response = await authBackend.account.delete();
    if (response) {
      await auth.logout();
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
            <AppText
              style={styles.modalTitle}
              translationKey="modals.delete_account.title"
            />
            <AppText
              style={styles.modalSubtitle}
              translationKey="modals.delete_account.warning"
            />
          </View>
        </View>

        {/* Confirmation Identity */}
        <View style={styles.section}>
          <AppText
            style={styles.sectionLabel}
            translationKey="modals.delete_account.confirmation_identity"
          />
          <AppText
            style={styles.inputLabel}
            translationKey="modals.delete_account.confirm_instruction"
            translationOptions={{ username }}
          >
            <AppText style={styles.boldUsername} text={username} />
          </AppText>
          <TextInput
            style={styles.input}
            value={inputUsername}
            onChangeText={setInputUsername}
            placeholder="Enter your username"
            placeholderTextColor={theme.placeholderText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppText style={styles.helperText}>
            <AppText translationKey="modals.delete_account.helper_text" />{" "}
            <AppText
              style={styles.linkText}
              onPress={() =>
                Linking.openURL(
                  "https://www.novyse.com/help/guides/account/delete",
                )
              }
              translationKey="modals.delete_account.learn_more"
            />
          </AppText>
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
            <AppText
              style={styles.cancelBtnText}
              translationKey="modals.delete_account.cancel"
            />
          </HoverAndPressedButton>
          <HoverAndPressedButton
            style={[styles.createBtn, !isMatch && styles.createBtnDisabled]}
            disabled={!isMatch}
            onPress={onConfirm}
          >
            <Icon name="Delete02Icon" size={18} />
            <AppText
              style={styles.createBtnText}
              translationKey="modals.delete_account.delete"
            />
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
      color: theme.dangerText,
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
      color: theme.icon,
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
    linkText: {
      color: theme.messageLink,
      textDecorationLine: "underline",
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
      color: theme.icon,
      fontSize: 15,
      fontWeight: "500",
    },
    createBtn: {
      backgroundColor: theme.dangerText,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    createBtnDisabled: {
      backgroundColor: theme.backgroundDanger,
    },
    createBtnText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
      marginLeft: 4,
    },
  });
};

export default DeleteAccount;
