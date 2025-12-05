import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import Icon from "./Icon";
import HeaderBase from "./HeaderBase";
import BlurredView from "./BlurredView";

const HeaderWithBackArrow = ({ goBackTo, title }) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);
  const router = useRouter();

  return (
    <HeaderBase style={styles.container}>
      <BlurredView>
        <Icon
          name={"ArrowLeft02Icon"}
          onPress={() => {
            if (goBackTo) {
              router.navigate(goBackTo);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              // fallback
              router.navigate("/chat");
            }
          }}
          style={styles.icon}
        />
      </BlurredView>
      {title && <BlurredView style={styles.titleContainer}>
        <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </BlurredView>}
    </HeaderBase>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      gap: 10,
      justifyContent: "flex-start",
      position: "absolute",
    },
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    titleContainer: {
      height: 45,
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    titleText: {
      fontSize: 18,
      fontWeight: 600,
      color: "white",
      textAlign: "center",
    },
  });

export default HeaderWithBackArrow;
