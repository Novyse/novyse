import React, { useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";

import Icon from "./Icon";
import BlurredHeader from "./BlurredHeader";

interface HeaderWithBackArrowProps {
  title?: string;
  onBack?: () => void;
}

const HeaderWithBackArrow = ({ title, onBack }: HeaderWithBackArrowProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  return (
    <BlurredHeader>
      {onBack && (
        <Icon
          name="ArrowLeft02Icon"
          onPress={() => {
            onBack();
          }}
          
          style={styles.icon}
        />
      )}
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
      )}

      <View style={styles.icon} />
    </BlurredHeader>
  );
};

const createStyle = (theme: unknown) =>
  StyleSheet.create({
    icon: {
      width: 45,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
    },
    titleContainer: {
      justifyContent: "center",
      paddingHorizontal: 15,
    },
    titleText: {
      fontSize: 18,
      fontWeight: "600",
      color: "white",
      textAlign: "center",
    },
  });

export default HeaderWithBackArrow;