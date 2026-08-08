import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";

const InitPage = () => {
  const { theme } = useThemeContext();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator
          size="large"
          color={theme.text}
          style={styles.loader}
        />
        <Typography
          weight="medium"
          translationKey="layout.loadingData"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loader: {
    marginBottom: 20,
    transform: [{ scale: 1.2 }],
  },
});

export default InitPage;
