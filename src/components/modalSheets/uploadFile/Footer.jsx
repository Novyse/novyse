import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "../../AppText";
import HoverAndPressedButton from "../../HoverAndPressedButton";

const Footer = ({
  files,
  leftButtonText,
  rightButtonText,
  leftBtnOnPress,
  rightButtonOnPress,
  leftBtnDisabled,
  rightBtnDisabled,
  theme,
}) => {
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <HoverAndPressedButton
        style={styles.leftBtn}
        onPress={leftBtnOnPress}
        disabled={leftBtnDisabled}
      >
        <AppText style={styles.leftBtnText} text={leftButtonText} />
      </HoverAndPressedButton>

      <HoverAndPressedButton
        style={styles.rightBtn}
        onPress={rightButtonOnPress}
        disabled={rightBtnDisabled}
      >
        <AppText style={styles.rightBtnText} text={rightButtonText} />
      </HoverAndPressedButton>
    </View>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      width: "100%",
      gap: 12,
    },
    leftBtn: {
      flex: 1,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
    },
    leftBtnText: {
      color: theme.text,
      fontWeight: "600",
      userSelect: "none",
    },
    rightBtn: {
      flex: 1,
      height: 50,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 25,
      elevation: 5,
    },
    rightBtnText: {
      color: theme.text,
      fontWeight: "600",
      userSelect: "none",
    },
  });

export default Footer;
