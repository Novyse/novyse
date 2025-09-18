import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import Icon from "../Icon";

const CameraArrowButton = ({
  onPress,
  theme,
  isMobile = Platform.OS !== "web",
}) => {

  return (
    <Pressable
      style={[
        styles.arrowButton,
        { backgroundColor: theme?.background || "rgba(0, 0, 0, 0.75)" },
      ]}
      onPress={onPress}
    >
      <Icon name={isMobile ? "CameraRotated01Icon" : "ArrowDown01Icon"} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  arrowButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
});

export default CameraArrowButton;
