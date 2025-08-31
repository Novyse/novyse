import React, { useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed, hovered }) => [
          styles.iconContainer,
          hovered && styles.arrowHovered,
          pressed && styles.arrowPressed,
        ]}
        onPress={() => router.replace(goBackTo)}
      >
        <HugeiconsIcon
          icon={ArrowLeft02Icon}
          size={24}
          color={theme.icon}
          strokeWidth={1.5}
        />
      </Pressable>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      padding: 15,
      alignItems: "flex-start",
      // backgroundColor: "#647444"
    },
    iconContainer: {
      padding: 5,
      borderRadius: "50%"
    },
    arrowHovered: {
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      cursor: "pointer",
    },
    arrowPressed: {
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      opacity: 0.9,
    },
  });

export default HeaderWithBackArrow;
