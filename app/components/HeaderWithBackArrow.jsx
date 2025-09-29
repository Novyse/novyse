import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Icon from "./Icon";
import HeaderBase from "./HeaderBase";

const HeaderWithBackArrow = ({ goBackTo }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <HeaderBase>
      <Icon
        name={"ArrowLeft02Icon"}
        onPress={() => router.replace(goBackTo)}
        style={styles.iconContainer}
      />
    </HeaderBase>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    iconContainer: {
      padding: 10,
    },
  });

export default HeaderWithBackArrow;
