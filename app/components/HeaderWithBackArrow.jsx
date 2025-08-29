import React, { useContext } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  //   const styles = createStyle(theme);
  const router = useRouter();

  return (
    <Pressable onPress={() => router.replace(goBackTo)}>
      <HugeiconsIcon
        icon={ArrowLeft02Icon}
        size={24}
        color={theme.icon}
        strokeWidth={1.5}
      />
    </Pressable>
  );
};

// const createStyle = (theme) =>
//   StyleSheet.create({
//   });

export default HeaderWithBackArrow;
