import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ThemeContext } from "@/src/context/ThemeContext";

import useClipboard from "@/src/hooks/useClipboard";

import Icon from "@/src/components/Icon";

interface AddAuthenticatorProps {
  secret: string;
  otpauth: string;
  QRSize: number;
  QRLogo: any;
}

const AddAuthenticator = ({
  secret,
  otpauth,
  QRSize = 180,
  QRLogo,
}: AddAuthenticatorProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { copied, copyToClipboard } = useClipboard();

  return (
    <View style={styles.authenticatorInfoContainer}>
      <View style={styles.qrcodeContainer}>
        <QRCode
          value={otpauth}
          logo={QRLogo}
          size={QRSize}
          enableLinearGradient={true}
          linearGradient={theme.backgroundMainGradient}
          logoBorderRadius={100}
          logoMargin={5}
          logoBackgroundColor={theme.text}
        />
      </View>
      <View style={styles.secretKeyContainer}>
        <Text
          style={styles.secretText}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {secret}
        </Text>
        <Icon
          name={copied ? "Tick01Icon" : "Copy01Icon"}
          style={styles.copyButton}
          onPress={() => copyToClipboard(secret)}
        />
      </View>
    </View>
  );
};

function createStyle(theme: any) {
  return StyleSheet.create({
    authenticatorInfoContainer: {
      width: "100%",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    qrcodeContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      backgroundColor: theme.text,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.primary,
    },
    secretKeyContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderColor,
      paddingLeft: 16,
      maxWidth: "70%",
    },
    secretText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      marginRight: 8,
      textAlign: "center",
    },
    copyButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

export default AddAuthenticator;
