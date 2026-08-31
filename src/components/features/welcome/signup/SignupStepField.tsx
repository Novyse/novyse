import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { validate } from "@/src/utils/welcome/validator";
import Icon from "@/src/components/ui/icon/Icon";
import LinkTypography from "@/src/components/ui/typography/LinkTypography";
import StatusMessage from "@/src/components/features/status/StatusMessage";

interface Props {
  currentStep: number;
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
  loginTheme?: LoginTheme;
}

export default function SignupStepField({
  currentStep,
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
  const styles = createStyles(loginTheme);

  const inputBorder = (
    valid: { success: boolean; error?: string } | null,
    value: string,
  ) => {
    if (!value) return null;
    if (valid?.success) return styles.inputSuccess;
    if (valid?.success === false) return styles.inputError;
    return null;
  };

  if (currentStep === 0) {
    const validation = validate.user.name(form.name);
    return (
      <View style={styles.group}>
        <View style={styles.inputGroup}>
          <Typography
            size="sm"
            weight="medium"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.displayName"
          />
          <View
            style={[
              styles.inputContainer,
              inputBorder(validation, form.name),
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={form.name}
              placeholder={t("auth.signupStep.displayNamePlaceholder")}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              onChangeText={(v) => onChangeField("name", v)}
              autoCapitalize="sentences"
            />
          </View>
          {!!(!validation.success && form.name) && (
            <StatusMessage
              type="danger"
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
          <Typography
            size="sm"
            weight="medium"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.username"
          />
          <View
            style={[
              styles.inputContainer,
              handleError
                ? styles.inputError
                : handleAvailable === true && form.handle
                  ? styles.inputSuccess
                  : null,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={form.handle}
              placeholder={t("auth.signupStep.usernamePlaceholder")}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              onChangeText={(v) => onChangeField("handle", v.toLowerCase())}
              autoCapitalize="none"
            />
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color={LoginColors[loginTheme].iconLoading}
                style={styles.fieldStatus}
              />
            ) : handleAvailable === true && !handleError ? (
              <Icon
                name="Tick01Icon"
                color={LoginColors[loginTheme].signupReqGreen}
                size={18}
                style={styles.fieldStatus}
              />
            ) : handleAvailable === false && !handleError ? (
              <Icon
                name="Cancel01Icon"
                color={LoginColors[loginTheme].signupReqRed}
                size={18}
                style={styles.fieldStatus}
              />
            ) : null}
          </View>
          <View style={styles.requirements}>
            {!!(handleError && form.handle) && (
              <StatusMessage type="danger" content={[handleError]} />
            )}
            {!!(handleAvailable === true && !handleError && form.handle) && (
              <Typography
                size="sm"
                color={LoginColors[loginTheme].signupReqGreen}
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
        <View style={styles.inputGroup}>
          <Typography
            size="sm"
            weight="medium"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.password"
          />
          <View
            style={[
              styles.inputContainer,
              inputBorder(validate.user.password(form.password), form.password),
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={form.password}
              placeholder={t("auth.signupStep.password")}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              secureTextEntry={showPassword}
              onChangeText={(v) => onChangeField("password", v)}
              autoCapitalize="none"
            />
            <Icon
              name={showPassword ? "ViewIcon" : "ViewOffIcon"}
              color={LoginColors[loginTheme].iconShowHideField}
              style={styles.eyeButton}
              onPress={onTogglePassword}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Typography
            size="sm"
            weight="medium"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.confirmPassword"
          />
          <View
            style={[
              styles.inputContainer,
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
              style={styles.textInput}
              value={form.confirmPassword}
              placeholder={t("auth.signupStep.confirmPasswordPlaceholder")}
              placeholderTextColor={
                LoginColors[loginTheme].placeholderTextInput
              }
              secureTextEntry={showConfirmPassword}
              onChangeText={(v) => onChangeField("confirmPassword", v)}
              autoCapitalize="none"
            />
            <Icon
              name={showConfirmPassword ? "ViewIcon" : "ViewOffIcon"}
              color={LoginColors[loginTheme].iconShowHideField}
              style={styles.eyeButton}
              onPress={onToggleConfirmPassword}
            />
          </View>
        </View>

        {passwordErrors.length > 0 && (
          <View style={styles.containerStatus}>
            <StatusMessage type="danger" content={passwordErrors} />
          </View>
        )}

        <View style={styles.opaqueLink}>
          <Typography
            size="sm"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.login.securedBy"
          />
          <LinkTypography
            size="sm"
            weight="semibold"
            color={LoginColors[loginTheme].title}
            text="OPAQUE"
            href="https://blog.cloudflare.com/it-it/opaque-oblivious-passwords/"
          />
        </View>
      </View>
    );
  }
}

function createStyles(loginTheme: LoginTheme) {
  return StyleSheet.create({
    group: {
      width: "100%",
      alignItems: "center",
    },
    inputGroup: {
      marginBottom: 16,
      width: "100%",
      maxWidth: 300,
      gap: 8,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      borderRadius: 25,
      borderWidth: 1.5,
      minHeight: 45,
      overflow: "hidden",
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
      borderColor: LoginColors[loginTheme].borderTextInput,
    },
    textInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 15,
      fontSize: 16,
      color: LoginColors[loginTheme].text,
      outlineStyle: "none" as any,
    },
    inputError: {
      borderColor: LoginColors[loginTheme].errorBorder,
      backgroundColor: LoginColors[loginTheme].errorBackground,
    },
    inputSuccess: {
      borderColor: LoginColors[loginTheme].successBorder,
      backgroundColor: LoginColors[loginTheme].successBackground,
    },
    eyeButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    fieldStatus: {
      marginRight: 10,
    },
    requirements: {
      width: "100%",
      maxWidth: 300,
    },
    containerStatus: {
      width: "100%",
      maxWidth: 300,
      marginBottom: 16,
    },
    opaqueLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 300,
    },
  });
}
