import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-svg";

import useClipboard from "@/src/hooks/useClipboard";

import logoForQR from "@/assets/images/logo-novyse.png";
import { APP_URL } from "@/app.config";

import ModalBase from "@/src/components/modalSheets/ModalBase";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import Avatar from "@/src/components/Avatar";

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  profilePictureUUID?: string;
  theme: any;
}

const QRCodeModal = ({
  visible,
  onClose,
  username,
  profilePictureUUID,
  theme,
}: QRCodeModalProps) => {
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const { copyToClipboard, copied } = useClipboard();

  const profileLink = `${APP_URL}/profile/${username}`;

  const handleCopy = () => {
    copyToClipboard(profileLink);
  };

  return (
    <ModalBase visible={visible} onClose={onClose} theme={theme}>
      <View style={styles.container}>
        <View style={styles.qrcodeContainer}>
          <View style={styles.avatarPosition}>
            <Avatar
              uuid={profilePictureUUID}
              theme={theme}
              size={80}
              style={styles.avatarBorder}
            />
          </View>
          <View style={{ height: 15 }} />
          <QRCode
            value={profileLink}
            logo={logoForQR}
            size={200}
            enableLinearGradient={true}
            linearGradient={["#013480", "#177FC0"]}
            logoBorderRadius={100}
            logoMargin={5}
            logoBackgroundColor={"#fff"}
          />
          <AppText
            style={styles.usernameText}
            text={`@${username ? username.toLocaleUpperCase() : ""}`}
          />
        </View>

        <View style={styles.linkContainer}>
          <HoverAndPressedButton
            onPress={handleCopy}
            style={styles.copyBox}
            disabled={copied}
          >
            <AppText
              style={[styles.linkText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
              text={copied ? t("profile.qrModal.copied") : profileLink}
            />
            <Icon
              name={copied ? "Tick01Icon" : "Copy01Icon"}
              size={20}
              color={theme.text}
            />
          </HoverAndPressedButton>
        </View>
      </View>
    </ModalBase>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      padding: 20,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minWidth: 320,
      marginTop: 40,
      position: "relative",
    },
    avatarPosition: {
      position: "absolute",
      top: -60,
      zIndex: 10,
      elevation: 10,
    },
    avatarBorder: {
      borderWidth: 4,
      borderColor: theme.backgroundMain || theme.background || "#000000",
    },
    usernameText: {
      fontSize: 30,
      fontWeight: "900",
      color: theme.primary,
      letterSpacing: 1.2,
      marginTop: 10,
    },
    qrcodeContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      marginBottom: 10,
      paddingHorizontal: 30,
      backgroundColor: "#ffffff",
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    linkContainer: {
      width: "100%",
      marginTop: 10,
      marginBottom: 10,
    },
    copyBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: "rgba(128, 128, 128, 0.1)",
      borderRadius: 10,
      width: "100%",
    },
    linkText: {
      flex: 1,
      marginRight: 10,
      fontSize: 14,
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 20,
      width: "100%",
      gap: 10,
    },
    shareText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default QRCodeModal;
