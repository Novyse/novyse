import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LoginColors } from "@/constants/LoginColors";
import { validate } from "@/src/utils/welcome/validator";
import Icon from "@/src/components/Icon";
import TextLink from "@/src/components/TextLink";
import ToggleSelector, { ToggleOption } from "@/src/components/ToggleSelector";

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", check: (p: string) => /[a-z]/.test(p) },
  { label: "One number", check: (p: string) => /[0-9]/.test(p) },
  {
    label: "One special character (@$!%*?&)",
    check: (p: string) => /[@$!%*?&]/.test(p),
  },
  {
    label: "Only allowed characters",
    check: (p: string) => /^[a-zA-Z0-9@$!%*?&]+$/.test(p),
  },
];

const HANDLE_REQUIREMENTS = [
  {
    label: "Starts with a letter or number",
    check: (h: string) => /^[a-z0-9]/.test(h),
  },
  {
    label: "Ends with a letter or number",
    check: (h: string) => /[a-z0-9]$/.test(h),
  },
  {
    label: "Only letters, numbers, and underscores",
    check: (h: string) => /^[a-z0-9_]+$/.test(h),
  },
  { label: "No consecutive underscores", check: (h: string) => !/__/.test(h) },
];

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
  const colors = (LoginColors as any)[loginTheme];
  const styles = createStyles(colors);

  const RequirementRow = ({ label, met }: { label: string; met: boolean }) => (
    <View style={styles.reqItem}>
      <Text
        style={[styles.reqIcon, met ? styles.reqGreen : styles.reqRed]}
        selectable={false}
      >
        {met ? (
          <Icon name="Tick01Icon" color={colors.signupReqGreen} size={16} />
        ) : (
          <Icon name="Cancel01Icon" color={colors.signupReqRed} size={16} />
        )}
      </Text>
      <Text style={[styles.reqText, { color: colors.subtitle }]}>{label}</Text>
    </View>
  );

  const inputBorder = (valid: boolean | null, value: string) => {
    if (!value) return {};
    return valid
      ? {
          borderColor: colors.successBorder,
          backgroundColor: colors.successBackground,
        }
      : {
          borderColor: colors.errorBorder,
          backgroundColor: colors.errorBackground,
        };
  };

  if (currentStep === 0) {
    const field = "name";
    const isValid = validate.user.name(form[field as keyof typeof form]);
    return (
      <View style={styles.group}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.subtitle }]}>
            Display Name
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                borderColor: colors.borderTextInput,
                backgroundColor: colors.backgroundTextInput,
              },
              inputBorder(isValid, form[field as keyof typeof form]),
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={form[field as keyof typeof form]}
              placeholder="Display Name"
              placeholderTextColor={colors.placeholderTextInput}
              onChangeText={(v) => onChangeField(field, v)}
              autoCapitalize="sentences"
            />
          </View>
        </View>
        <View style={styles.requirements}>
          <RequirementRow
            label="Name: only letters and spaces"
            met={validate.user.name(form.name)}
          />
        </View>
      </View>
    );
  }

  if (currentStep === 1) {
    const showAvailability = form.handle.trim() && validate.handle(form.handle);
    return (
      <View style={styles.group}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.subtitle }]}>
            Username
          </Text>
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
              placeholder="Username"
              placeholderTextColor={colors.placeholderTextInput}
              onChangeText={(v) => onChangeField("handle", v)}
              autoCapitalize="none"
            />
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={colors.iconLoading}
                style={{ marginRight: 10 }}
              />
            )}
          </View>
          <View style={styles.requirements}>
            {HANDLE_REQUIREMENTS.map((r) => (
              <RequirementRow
                key={r.label}
                label={r.label}
                met={r.check(form.handle)}
              />
            ))}
            {!!showAvailability && (
              <View style={styles.reqItem}>
                <Text
                  style={[
                    styles.reqIcon,
                    isLoading
                      ? { color: colors.signupReqGray }
                      : handleAvailable
                        ? styles.reqGreen
                        : styles.reqRed,
                  ]}
                >
                  {isLoading ? (
                    <Icon
                      name="MoreHorizontalIcon"
                      color={colors.signupReqGray}
                      size={16}
                    />
                  ) : handleAvailable ? (
                    <Icon
                      name="Tick01Icon"
                      color={colors.signupReqGreen}
                      size={16}
                    />
                  ) : (
                    <Icon
                      name="Cancel01Icon"
                      color={colors.signupReqRed}
                      size={16}
                    />
                  )}
                </Text>
                <Text style={[styles.reqText, { color: colors.subtitle }]}>
                  {isLoading
                    ? "Checking..."
                    : handleAvailable
                      ? "Available"
                      : "Already in use"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (currentStep === 2) {
    const valid = validate.user.password(form.password);
    const passwordsMatch =
      form.confirmPassword.length > 0 && form.password === form.confirmPassword;
    const confirmMismatch =
      form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

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
              <Text style={[styles.label, { color: colors.subtitle }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.borderTextInput,
                    backgroundColor: colors.backgroundTextInput,
                  },
                  inputBorder(valid, form.password),
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={form.password}
                  placeholder="Password"
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
              <Text style={[styles.label, { color: colors.subtitle }]}>
                Confirm Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    borderColor: colors.borderTextInput,
                    backgroundColor: colors.backgroundTextInput,
                  },
                  inputBorder(
                    passwordsMatch ? true : confirmMismatch ? false : null,
                    form.confirmPassword,
                  ),
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={form.confirmPassword}
                  placeholder="Confirm Password"
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
              <View style={styles.opaqueLink}>
                <Text style={styles.opaqueLinkText}>Secured by </Text>
                <TextLink
                  style={styles.opaqueLinkTextBold}
                  href="https://opaque-auth.com/"
                >
                  OPAQUE
                </TextLink>
              </View>
            </View>

            {/* <View style={styles.requirements}>
          {PASSWORD_REQUIREMENTS.map((r) => (
            <RequirementRow
              key={r.label}
              label={r.label}
              met={r.check(form.password)}
            />
          ))}
          <RequirementRow label="Passwords match" met={passwordsMatch} />
          </View> */}
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
