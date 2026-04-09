import { View, StyleSheet } from "react-native";
import AppText from "@/src/components/AppText";

const PasskeyPage = () => {
  return (
    <View style={styles.container}>
      <AppText style={styles.text} translationKey="auth.passkey.notSupported" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    color: "red",
  },
});

export default PasskeyPage;
