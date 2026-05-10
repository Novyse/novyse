import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/AppText";
import { ThemeContext } from "@/src/context/ThemeContext";

import Icon from "./Icon";
import BlurredHeader from "./BlurredHeader";

interface HeaderWithBackArrowProps {
  title?: string;
  translationKey?: string;
  onBack?: () => void;
}

const HeaderWithBackArrow = ({ title, translationKey, onBack }: HeaderWithBackArrowProps) => {
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
      {translationKey ? (
        <View style={styles.titleContainer}>
          <AppText style={styles.titleText} translationKey={translationKey} numberOfLines={1} ellipsizeMode="tail" />
        </View>
      ) : title ? (
        <View style={styles.titleContainer}>
          <AppText style={styles.titleText} text={title} numberOfLines={1} ellipsizeMode="tail" />
        </View>
      ) : null}

      <View style={styles.icon} />
    </BlurredHeader>
  );
};

const createStyle = (theme: any) =>
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
      color: theme.text,
      textAlign: "center",
    },
  });

export default HeaderWithBackArrow;