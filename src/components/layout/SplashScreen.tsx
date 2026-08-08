import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LoginColors } from "@/constants/LoginColors";

// @ts-ignore
import logoNovyse from "@/assets/images/logo-novyse.png";

const SplashScreen = () => {
    return (
        <LinearGradient
            colors={LoginColors.default.background as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                <Image source={logoNovyse} style={styles.logo} resizeMode="contain" />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        width: 200,
        height: 200,
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: "100%",
        height: "100%",
    },
});

export default SplashScreen;
