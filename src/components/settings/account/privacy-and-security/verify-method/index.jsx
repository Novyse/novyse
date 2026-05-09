import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";

import useOTP from "@/src/hooks/auth/useOTP";

import AddAuthenticator from "@/src/components/auth/twofa/add/authenticator";
import OtpDigitsInput from "@/src/components/OtpDigitsInput";

import StatusMessage from "@/src/components/StatusMessage";
import logoForQR from "@/assets/images/logo-novyse.png";

import ModalBase from "@/src/components/modalSheets/ModalBase";

const ModalVerifyMethod = ({
  visible,
  onClose,
  theme,
  token,
  verificationType,
  secret,
  otpauth,
}) => {
  const styles = createStyle(theme);

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
    <ModalBase
      visible={visible}
      onClose={() => {
        setOtp(["", "", "", "", "", ""]);
        setError(null);
        onClose();
      }}
      theme={theme}
      hideCloseX={false}
    >
      <View style={styles.cardContent}>
        <AppText
          style={styles.title}
          translationKey={getFormattedVerificationTypeKey()}
        />
        <AppText
          style={styles.subtitle}
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
          <Pressable
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handlePress}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.textInverted} />
            ) : (
              <AppText
                style={styles.submitButtonText}
                translationKey="auth.verify.verifyBtn"
              />
            )}
          </Pressable>
        </View>

        <StatusMessage
          type="error"
          content={[error]}
          visible={!!error}
          onClose={() => setError(null)}
        />
      </View>
    </ModalBase>
  );
};

function createStyle(theme) {
  return StyleSheet.create({
    cardContent: {
      alignItems: "center",
      gap: 24,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      color: theme.subtitle,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    inputSection: {
      width: "100%",
      alignItems: "center",
      gap: 24,
    },
    submitButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: "center",
      width: "100%",
      justifyContent: "center",
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: theme.text,
      fontWeight: "600",
      fontSize: 16,
    },
  });
}

export default ModalVerifyMethod;
