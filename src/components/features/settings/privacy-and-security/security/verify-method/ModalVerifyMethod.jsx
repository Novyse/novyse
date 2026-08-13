import React, { useState } from "react";
import { View, StyleSheet } from "react-native";

import useOTP from "@/src/hooks/auth/useOTP";

import AddAuthenticator from "@/src/components/features/settings/account/privacy-and-security/verify-method/AddAuthenticator";
import OtpDigitsInput from "@/src/components/features/settings/privacy-and-security/security/OtpDigitsInput";

import StatusMessage from "@/src/components/features/status/StatusMessage";
import logoForQR from "@/assets/images/logo-novyse.png";

import AdaptiveModal from "@/src/components/features/modalSheets/components/AdaptiveModal";
import Button from "@/src/components/ui/button/Button";
import Typography from "@/src/components/ui/typography/Typography";

const ModalVerifyMethod = ({
  visible,
  onClose,
  theme,
  token,
  verificationType,
  secret,
  otpauth,
}) => {
  const styles = createStyle();

  const { isLoading, error, setError, handleVerifyOtp } = useOTP();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  React.useEffect(() => {
    const fullOtp = otp.join("");
    if (fullOtp.length === 6 && /^\d+$/.test(fullOtp) && !isLoading) {
      handlePress();
    }
  }, [otp]);

  const getFormattedVerificationTypeKey = () => {
    switch (verificationType) {
      case "email":
        return "auth.verify.titleEmailOtp";
      case "email_verification":
        return "auth.verify.titleVerifyEmail";
      case "authenticator":
        return "auth.verify.titleAuthenticatorApp";
      default:
        return "auth.verify.verifyCode";
    }
  };

  const getSubtitleTextKey = () => {
    switch (verificationType) {
      case "email":
      case "email_verification":
        return "auth.verify.subtitle";
      case "authenticator":
        return "auth.verify.subtitleAuthApp";
      default:
        return "auth.verify.subtitleDefault";
    }
  };

  const handlePress = async () => {
    const result = await handleVerifyOtp(token, otp.join(""));
    if (result) {
      setOtp(["", "", "", "", "", ""]);
      setError(null);
      onClose();
    }
  };

  return (
    <AdaptiveModal
      visible={visible}
      onClose={() => {
        setOtp(["", "", "", "", "", ""]);
        setError(null);
        onClose();
      }}
      theme={theme}
      mode="modal"
      titleTranslationKey={getFormattedVerificationTypeKey()}
    >
      <View style={styles.cardContent}>
        <Typography
          variant="subtitle"
          translationKey={getSubtitleTextKey()}
        />

        {verificationType === "authenticator" && secret && otpauth && (
          <AddAuthenticator
            secret={secret}
            otpauth={otpauth}
            QRSize={180}
            QRLogo={logoForQR}
          />
        )}

        <View style={styles.inputSection}>
          <OtpDigitsInput
            value={otp}
            onChange={setOtp}
            error={!!error}
            inputCount={6}
          />
          <Button
            translationKey="auth.verify.verifyBtn"
            onPress={handlePress}
            disabled={isLoading}
            style={{ width: "100%" }}
          />
        </View>

        <StatusMessage
          type="danger"
          content={[error]}
          visible={!!error}
          onClose={() => setError(null)}
        />
      </View>
    </AdaptiveModal>
  );
};

function createStyle() {
  return StyleSheet.create({
    cardContent: {
      alignItems: "center",
      gap: 25,
      padding: 20,
    },
    inputSection: {
      width: "100%",
      alignItems: "center",
      gap: 25,
    },
  });
}

export default ModalVerifyMethod;
