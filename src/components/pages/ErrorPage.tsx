import { View, StyleSheet, Image } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { LoginColors } from "@/constants/LoginColors";
import { useScreen } from "@/src/context/ScreenContext";
import logoNovyse from "@/assets/images/logo-novyse.png";

const LOGIN_THEME = "default";

export default function ErrorPage() {
  const { isSmallScreen } = useScreen();
  const styles = createStyle(isSmallScreen);

  return (
    <LinearGradient
      colors={LoginColors[LOGIN_THEME].background as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image style={styles.logo} source={logoNovyse} />
          <AppText
            style={styles.title}
            translationKey="common.errorPage.title"
          />
          <AppText
            style={styles.message}
            translationKey="common.errorPage.message"
          />
          <AppText
            style={styles.messageSecondary}
            translationKey="common.errorPage.messageSecondary"
          />
          <AppText
            style={styles.messageTertiary}
            translationKey="common.errorPage.messageTertiary"
          />
        </View>
      </View>
    </LinearGradient>
  );
}

function createStyle(isSmallScreen: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: isSmallScreen ? 0 : 24,
    },
    card: {
      padding: isSmallScreen ? 24 : 40,
      borderRadius: isSmallScreen ? 0 : 20,
      backgroundColor: LoginColors[LOGIN_THEME].backgroundCard,
      width: isSmallScreen ? "100%" : 450,
      height: isSmallScreen ? "100%" : "auto",
      justifyContent: "center",
      alignItems: "center",
    },
    cardContent: {
      width: "100%",
      alignItems: "center",
    },
    logo: {
      height: 100,
      width: 100,
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      color: LoginColors[LOGIN_THEME].title,
      marginBottom: 20,
      textAlign: "center",
    },
    message: {
      fontSize: 18,
      color: LoginColors[LOGIN_THEME].subtitle,
      textAlign: "center",
      marginBottom: 16,
      lineHeight: 26,
      fontWeight: "500",
    },
    messageSecondary: {
      fontSize: 14,
      color: LoginColors[LOGIN_THEME].subtitle2,
      textAlign: "center",
      lineHeight: 20,
      fontStyle: "italic",
      marginBottom: 24,
    },
    messageTertiary: {
      fontSize: 13,
      color: LoginColors[LOGIN_THEME].subtitle2,
      textAlign: "center",
      lineHeight: 18,
      opacity: 0.8,
    },
  });
}
