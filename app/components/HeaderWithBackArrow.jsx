import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <Pressable
      style={styles.container}
      onPress={() => router.replace(goBackTo)}
    >
      <HugeiconsIcon
        icon={ArrowLeft02Icon}
        size={24}
        color={theme.icon}
        strokeWidth={1.5}
      />
    </Pressable>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      padding: 15,
      // backgroundColor: "#647444"
    },
  });

export default HeaderWithBackArrow;
