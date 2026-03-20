import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { LoginColors } from "@/constants/LoginColors";
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
  const colors = LoginColors[loginTheme];

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
        <Text style={[styles.tick, { color: colors.checkboxTick }]}>✓</Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Checkbox checked={privacyAccepted} onPress={onTogglePrivacyTos} />
        <Text style={styles.text}>
          I accept{" "}
          <TextLink
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
            style={{ color: colors.link, fontSize: 14 }}
          >
            privacy policy
          </TextLink>{" "}
          and{" "}
          <TextLink
            onPress={() => openUrl(TOS_URL)}
            style={{ color: colors.link, fontSize: 14 }}
          >
            terms of service
          </TextLink>
        </Text>
      </View>

      <View style={[styles.row, { marginTop: 10 }]}>
        <Checkbox checked={ageConfirmed} onPress={onToggleAge} />
        <Text style={styles.text}>I am 16 or older.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, maxWidth: 300 },
  row: { flexDirection: "row", alignItems: "flex-start" },
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
  text: { fontSize: 14, lineHeight: 20, flex: 1 },
});
