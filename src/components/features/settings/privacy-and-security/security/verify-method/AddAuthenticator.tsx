import { useContext } from "react";
import { View, StyleSheet, Image } from "react-native";
import QRCode from "react-native-qrcode-skia";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { ThemeContext } from "@/src/context/ThemeContext";

import useClipboard from "@/src/hooks/useClipboard";

import Icon from "@/src/components/ui/icon/Icon";
import Typography from "@/src/components/ui/typography/Typography";

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
          size={QRSize}
          logoAreaSize={55}
          logoAreaBorderRadius={10}
          logo={
            <View
              style={{
                width: 45,
                height: 45,
                borderRadius: 8,
                backgroundColor: theme.text,
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <Image
                source={QRLogo}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            </View>
          }
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, QRSize)}
            colors={theme.backgroundMainGradient}
          />
        </QRCode>
      </View>
      <View style={styles.secretKeyContainer}>
        <Typography
          text={secret}
          numberOfLines={1}
          ellipsizeMode="middle"
        />
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
    copyButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

export default AddAuthenticator;
