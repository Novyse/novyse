import { Platform, Pressable, StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";
import * as Linking from "expo-linking";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";
import { PRIVACY_POLICY_URL, TOS_URL } from "@/app.config";
import TextLink from "@/src/components/TextLink";

interface Props {
  privacyAccepted: boolean;
  tosAccepted: boolean;
  ageConfirmed: boolean;
  onTogglePrivacyTos: () => void;
  onToggleAge: () => void;
  loginTheme?: string;
}

export default function SignupCheckboxes({
  privacyAccepted,
  ageConfirmed,
  onTogglePrivacyTos,
  onToggleAge,
  loginTheme = "default",
}: Props) {
  const colors = LoginColors[loginTheme as LoginTheme];
  const styles = createStyles(colors);

  const openUrl = (url: string) => {
    if (Platform.OS === "web") window.open(url, "_blank");
    else Linking.openURL(url);
  };

  const Checkbox = ({
    checked,
    onPress,
  }: {
    checked: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.checkbox,
        {
          borderColor: checked ? colors.backgroundSubmitButton : "#ccc",
          backgroundColor: checked ? colors.backgroundSubmitButton : "#fff",
        },
      ]}
    >
      {checked && (
        <AppText
          style={[styles.tick, { color: colors.checkboxTick }]}
          text="✓"
        />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Checkbox checked={privacyAccepted} onPress={onTogglePrivacyTos} />
        <AppText style={styles.text}>
          <AppText translationKey="auth.signupStep.iAccept" />{" "}
          <AppText
            translationKey="auth.signupStep.privacyPolicy"
            style={{ color: colors.link }}
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
          />{" "}
          <AppText translationKey="auth.signupStep.and" />{" "}
          <AppText
            translationKey="auth.signupStep.termsOfService"
            style={{ color: colors.link }}
            onPress={() => openUrl(TOS_URL)}
          />
        </AppText>
      </View>

      <View style={[styles.row, { marginTop: 10 }]}>
        <Checkbox checked={ageConfirmed} onPress={onToggleAge} />
        <AppText style={styles.text} translationKey="auth.signupStep.iAm16" />
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
      maxWidth: 300,
      width: "100%",
      alignSelf: "center",
    },
    row: { flexDirection: "row", alignItems: "flex-start", width: "100%" },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
      marginTop: 1,
    },
    tick: { fontWeight: "bold", fontSize: 12 },
    text: { fontSize: 14, lineHeight: 20, flex: 1, color: colors.subtitle },
  });
