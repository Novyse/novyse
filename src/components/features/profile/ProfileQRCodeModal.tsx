import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { useTranslation } from "react-i18next";
import QRCode from "react-native-qrcode-skia";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { Image } from "react-native";

import useClipboard from "@/src/hooks/useClipboard";

import logoForQR from "@/assets/images/logo-novyse.png";
import { APP_URL } from "@/app.config";

import AdaptiveModal from "@/src/components/modalSheets/components/AdaptiveModal";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";
import Avatar from "@/src/components/ui/avatar/Avatar";

interface ProfileQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  profilePictureUUID?: string;
  theme: any;
}

const ProfileQRCodeModal = ({
  visible,
  onClose,
  username,
  profilePictureUUID,
  theme,
}: ProfileQRCodeModalProps) => {
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const { copyToClipboard, copied } = useClipboard();

  const profileLink = `${APP_URL}/profile/${username}`;

  const handleCopy = () => {
    copyToClipboard(profileLink);
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={onClose}
      theme={theme}
      snapPoints={["90%"]}
    >
      <View style={styles.container}>
        <View style={styles.qrcodeContainer}>
          <View style={styles.avatarPosition}>
            <Avatar uuid={profilePictureUUID} size={80} />
          </View>
          <View style={{ height: 15 }} />
          <QRCode
            value={profileLink}
            size={200}
            logoAreaSize={65}
            logoAreaBorderRadius={12}
            logo={
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 10,
                  backgroundColor: theme.icon,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <Image
                  source={logoForQR}
                  style={{ width: 40, height: 40, resizeMode: "contain" }}
                />
              </View>
            }
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, 200)}
              colors={theme.backgroundMainGradient}
            />
          </QRCode>
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
              text={profileLink}
            />
            <Icon
              name={copied ? "Tick01Icon" : "Copy01Icon"}
              size={20}
              color={theme.text}
            />
          </HoverAndPressedButton>
        </View>
      </View>
    </AdaptiveModal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingTop: 55,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minWidth: 320,
      position: "relative",
    },
    avatarPosition: {
      position: "absolute",
      top: -60,
      zIndex: 10,
      elevation: 10,
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
      padding: 15,
      marginBottom: 10,
      paddingHorizontal: 30,
      backgroundColor: theme.icon,
      borderRadius: 25,
      borderWidth: 3,
      borderColor: theme.primary,
    },
    linkContainer: {
      width: "100%",
      marginTop: 15,
    },
    copyBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: theme.secondary,
      borderRadius: 10,
      width: "100%",
    },
    linkText: {
      flex: 1,
      marginRight: 10,
      fontSize: 14,
    },
  });

export default ProfileQRCodeModal;
