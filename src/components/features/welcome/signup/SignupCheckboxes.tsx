import { Pressable, StyleSheet, View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import LinkTypography from "@/src/components/ui/typography/LinkTypography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { PRIVACY_POLICY_URL, TOS_URL } from "@/app.config";

interface Props {
  privacyAccepted: boolean;
  tosAccepted: boolean;
  ageConfirmed: boolean;
  onTogglePrivacyTos: () => void;
  onToggleAge: () => void;
  loginTheme?: LoginTheme;
}

export default function SignupCheckboxes({
  privacyAccepted,
  ageConfirmed,
  onTogglePrivacyTos,
  onToggleAge,
  loginTheme = "default",
}: Props) {
  const styles = createStyles(loginTheme);

  const Checkbox = ({
    checked,
    onPress,
  }: {
    checked: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.checkbox, checked && styles.checkboxChecked]}
    >
      {checked && (
        <Typography
          size="xs"
          weight="bold"
          color={LoginColors[loginTheme].checkboxTick}
          text="✓"
        />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Checkbox checked={privacyAccepted} onPress={onTogglePrivacyTos} />
        <View style={styles.textWrap}>
          <Typography
            size="sm"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.iAccept"
          />
          <LinkTypography
            size="sm"
            weight="semibold"
            color={LoginColors[loginTheme].title}
            translationKey="auth.signupStep.privacyPolicy"
            href={PRIVACY_POLICY_URL}
          />
          <Typography
            size="sm"
            color={LoginColors[loginTheme].subtitle}
            translationKey="auth.signupStep.and"
          />
          <LinkTypography
            size="sm"
            weight="semibold"
            color={LoginColors[loginTheme].title}
            translationKey="auth.signupStep.termsOfService"
            href={TOS_URL}
          />
        </View>
      </View>

      <View style={styles.row}>
        <Checkbox checked={ageConfirmed} onPress={onToggleAge} />
        <Typography
          size="sm"
          color={LoginColors[loginTheme].subtitle}
          translationKey="auth.signupStep.iAm16"
        />
      </View>
    </View>
  );
}

function createStyles(loginTheme: LoginTheme) {
  return StyleSheet.create({
    container: {
      marginBottom: 16,
      maxWidth: 300,
      width: "100%",
      alignSelf: "center",
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      width: "100%",
    },
    textWrap: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 4,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
      marginTop: 1,
      borderColor: LoginColors[loginTheme].borderTextInput,
      backgroundColor: LoginColors[loginTheme].backgroundTextInput,
    },
    checkboxChecked: {
      borderColor: LoginColors[loginTheme].backgroundSubmitButton,
      backgroundColor: LoginColors[loginTheme].backgroundSubmitButton,
    },
  });
}
