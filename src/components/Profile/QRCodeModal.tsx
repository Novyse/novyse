import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";

import useClipboard from "@/src/hooks/useClipboard";

import logoForQR from "@/assets/images/logo-novyse.png";

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
  const styles = createStyles(theme);

  const { copyToClipboard, copied } = useClipboard();

  // Assuming your app runs on localhost:8081 for web or just link profile
  // If we're on mobile we probably just want a deep link like "novyse://profile/username"
  // But strictly following user's request:
  const profileLink = `http://localhost:8081/profile/${username}`;

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
          <Text style={styles.usernameText}>
            @{username.toLocaleUpperCase()}
          </Text>
        </View>

        <View style={styles.linkContainer}>
          <HoverAndPressedButton
            onPress={handleCopy}
            style={styles.copyBox}
            disabled={copied}
          >
            <Text
              style={[styles.linkText, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {profileLink}
            </Text>
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
      borderColor: theme.backgroundModal || theme.background || "#000000",
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
