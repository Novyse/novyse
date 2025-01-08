import { Text, View, StyleSheet, Pressable, Image } from "react-native";
import { useState, useContext, useEffect } from "react";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { colorScheme, setColorScheme, theme } = useContext(ThemeContext);

  const styles = createStyle(theme, colorScheme);

  const router = useRouter();

  useEffect (() => {

  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.containerStart}>
          <Image
            style={styles.containerStartImage}
            source={{
              uri: "https://picsum.photos/200",
            }}
          />
          <Pressable style={styles.containerStartButton} onPress={ () => router.push(`/loginSignup/EmailCheckForm`)}>
            <Text style={styles.containerStartButtonText}>
              Start
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function createStyle(theme, colorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundClassic,
    },
    containerStart: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    containerStartImage: {
      width: 200,
      height: 200,
      borderRadius: 100,
      marginBottom: 40
    },
    containerStartButton:{
      backgroundColor: theme.button,
      paddingHorizontal: 20,
      paddingVertical: 5,
      borderRadius: 100,
    },
    containerStartButtonText:{
      color: theme.text,
      fontSize: 18,
    }
  });
}
