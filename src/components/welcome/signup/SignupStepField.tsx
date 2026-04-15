import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import AppText from "@/src/components/AppText";
import { LoginColors } from "@/constants/LoginColors";
import { validate } from "@/src/utils/welcome/validator";
import Icon from "@/src/components/Icon";
import TextLink from "@/src/components/TextLink";
import ToggleSelector, { ToggleOption } from "@/src/components/ToggleSelector";
import StatusMessage from "@/src/components/StatusMessage";

const SIGNUP_MODE_OPTIONS: ToggleOption<"password" | "passkey">[] = [
  { value: "password", label: "Password" },
  { value: "passkey", label: "Passkey" },
];

interface Props {
  currentStep: number;
  signupMode?: "password" | "passkey";
  onSignupModeChange?: (mode: "password" | "passkey") => void;
  form: {
    name: string;
    password: string;
    confirmPassword: string;
    handle: string;
  };
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  handleAvailable: boolean | null;
  handleError: string | null;
  onChangeField: (field: string, value: string) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  loginTheme?: string;
}

export default function SignupStepField({
  currentStep,
  signupMode = "password",
  onSignupModeChange,
  form,
  showPassword,
  showConfirmPassword,
  isLoading,
  handleAvailable,
  handleError,
  onChangeField,
  onTogglePassword,
  onToggleConfirmPassword,
  loginTheme = "default",
}: Props) {
  const { t } = useTranslation();
  const colors = (LoginColors as any)[loginTheme];
  const styles = createStyles(colors);

  const inputBorder = (
    valid: { success: boolean; error?: string } | null,
    value: string,
  ) => {
    if (!value) return {};
    return valid?.success
      ? {
          borderColor: colors.successBorder,
          backgroundColor: colors.successBackground,
        }
      : valid?.success === false
        ? {
            borderColor: colors.errorBorder,
            backgroundColor: colors.errorBackground,
          }
        : {};
  };

  if (currentStep === 0) {
    const field = "name";
    const validation = validate.user.name(form[field as keyof typeof form]);
    return (
      <View style={styles.group}>
        <View style={styles.inputGroup}>
          <AppText
            style={[styles.label, { color: colors.subtitle }]}
            translationKey="auth.signupStep.displayName"
          />
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: colors.borderTextInput,
                backgroundColor: colors.backgroundTextInput,
              },
              inputBorder(validation, form[field as keyof typeof form]),
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={form[field as keyof typeof form]}
              placeholder={t("auth.signupStep.displayNamePlaceholder")}
              placeholderTextColor={colors.placeholderTextInput}
              onChangeText={(v) => onChangeField(field, v)}
              autoCapitalize="sentences"
            />
          </View>
          {!validation.success && form.name && (
            <StatusMessage
              type="error"
              content={[validation.error]}
              visible={true}
            />
          )}
        </View>
      </View>
    );
  }

  if (currentStep === 1) {
    return (
      <View style={styles.group}>
        <View style={styles.inputGroup}>
          <AppText
            style={[styles.label, { color: colors.subtitle }]}
            translationKey="auth.signupStep.username"
          />
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: colors.borderTextInput,
                backgroundColor: colors.backgroundTextInput,
              },
              handleError
                ? {
                    borderColor: colors.errorBorder,
                    backgroundColor: colors.errorBackground,
                  }
                : handleAvailable === true && form.handle
                  ? {
                      borderColor: colors.successBorder,
                      backgroundColor: colors.successBackground,
                    }
                  : {},
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={form.handle}
              placeholder={t("auth.signupStep.usernamePlaceholder")}
              placeholderTextColor={colors.placeholderTextInput}
              onChangeText={(v) => onChangeField("handle", v.toLowerCase())}
              autoCapitalize="none"
            />
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.iconLoading}
                style={{ marginRight: 10 }}
              />
            ) : handleAvailable === true && !handleError ? (
              <Icon
                name="Tick01Icon"
                color={colors.signupReqGreen}
                size={18}
                style={{ marginRight: 10 }}
              />
            ) : handleAvailable === false && !handleError ? (
              <Icon
                name="Cancel01Icon"
                color={colors.signupReqRed}
                size={18}
                style={{ marginRight: 10 }}
              />
            ) : null}
          </View>
          <View style={styles.requirements}>
            {handleError && form.handle && (
              <StatusMessage type="error" content={[handleError]} />
            )}
            {handleAvailable === true && !handleError && form.handle && (
              <AppText
                style={{
                  color: colors.signupReqGreen,
                  fontSize: 13,
                  marginTop: 4,
                }}
                translationKey="common.auth.signupStep.available"
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  if (currentStep === 2) {
    const passwordsMatch =
      form.confirmPassword.length > 0 && form.password === form.confirmPassword;
    const confirmMismatch =
      form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

    const passwordErrors = [];
    const passwordValidation = validate.user.password(form.password);
    if (!passwordValidation.success && form.password) {
      passwordErrors.push(passwordValidation.error);
    }
    if (confirmMismatch) {
      passwordErrors.push(t("common.auth.signupStep.passwordsMismatch"));
    }

    return (
      <View style={styles.group}>
        {onSignupModeChange && (
          <ToggleSelector
            options={SIGNUP_MODE_OPTIONS}
            value={signupMode}
            onChange={onSignupModeChange}
            disabled={isLoading}
          />
        )}
        {signupMode === "password" && (
          <>
            <View style={styles.inputGroup}>
              <AppText
                style={[styles.label, { color: colors.subtitle }]}
                translationKey="auth.signupStep.password"
              />
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.borderTextInput,
                    backgroundColor: colors.backgroundTextInput,
                  },
                  inputBorder(
                    validate.user.password(form.password),
                    form.password,
                  ),
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={form.password}
                  placeholder={t("auth.signupStep.password")}
                  placeholderTextColor={colors.placeholderTextInput}
                  secureTextEntry={showPassword}
                  onChangeText={(v) => onChangeField("password", v)}
                  autoCapitalize="none"
                />
                <Icon
                  name={showPassword ? "ViewIcon" : "ViewOffIcon"}
                  color={colors.iconShowHideField}
                  style={styles.eyeButton}
                  onPress={onTogglePassword}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <AppText
                style={[styles.label, { color: colors.subtitle }]}
                translationKey="auth.signupStep.confirmPassword"
              />
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.borderTextInput,
                    backgroundColor: colors.backgroundTextInput,
                  },
                  inputBorder(
                    passwordsMatch
                      ? { success: true }
                      : confirmMismatch
                        ? { success: false }
                        : null,
                    form.confirmPassword,
                  ),
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={form.confirmPassword}
                  placeholder={t("auth.signupStep.confirmPasswordPlaceholder")}
                  placeholderTextColor={colors.placeholderTextInput}
                  secureTextEntry={showConfirmPassword}
                  onChangeText={(v) => onChangeField("confirmPassword", v)}
                  autoCapitalize="none"
                />
                <Icon
                  name={showConfirmPassword ? "ViewIcon" : "ViewOffIcon"}
                  color={colors.iconShowHideField}
                  style={styles.eyeButton}
                  onPress={onToggleConfirmPassword}
                />
              </View>
            </View>

            {passwordErrors.length > 0 && (
              <View style={{ width: "100%", maxWidth: 300, marginBottom: 16, marginTop: -8 }}>
                <StatusMessage type="error" content={passwordErrors} />
              </View>
            )}

            <View style={styles.opaqueLink}>
              <AppText
                style={styles.opaqueLinkText}
                translationKey="auth.login.securedBy"
              />
              <TextLink
                style={styles.opaqueLinkTextBold}
                href="https://opaque-auth.com/"
              >
                OPAQUE
              </TextLink>
            </View>
          </>
        )}
      </View>
    );
  }
}

const createStyles = (colors: any) => {
  return StyleSheet.create({
    group: {
      width: "100%",
      alignItems: "center",
    },
    inputGroup: {
      marginBottom: 16,
      width: "100%",
      maxWidth: 300,
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: "500",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 25,
      borderWidth: 1.5,
      minHeight: 45,
      overflow: "hidden",
    },
    textInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 15,
      fontSize: 16,
      outlineStyle: "none" as any,
    },
    eyeButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    requirements: {
      marginTop: 4,
      width: "100%",
      maxWidth: 300,
    },
    reqItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    reqIcon: {
      fontSize: 12,
      fontWeight: "bold",
    },
    reqGreen: {
      color: "#22c55e",
    },
    reqRed: {
      color: "#ef4444",
    },
    reqText: {
      fontSize: 12,
    },
    opaqueLink: {
      marginBottom: 20,
      marginTop: 5,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    opaqueLinkText: { fontSize: 11, color: colors.subtitle2 },
    opaqueLinkTextBold: {
      color: colors.title,
      fontWeight: "600",
      fontSize: 11,
    },
    passkeyContent: {
      width: "100%",
      maxWidth: 300,
      alignItems: "center",
      paddingVertical: 16,
      gap: 12,
    },
    passkeyIcon: { marginBottom: 4, opacity: 0.6 },
    passkeyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
    passkeyDescription: {
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 8,
    },
  });
};
