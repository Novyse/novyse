import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import HoverAndPressedButton from "./HoverAndPressedButton"; // Importa il nuovo componente

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HoverAndPressedButton
        onPress={() => router.replace(goBackTo)}
        containerStyle={styles.iconContainer}
      >
        <HugeiconsIcon
          icon={ArrowLeft02Icon}
          size={24}
          color={theme.icon}
          strokeWidth={1.5}
        />
      </HoverAndPressedButton>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      padding: 15,
      height: 60,
      alignItems: "flex-start",
    },
    iconContainer: {
      padding: 5,
      borderRadius: "50%",
    }
  });

export default HeaderWithBackArrow;