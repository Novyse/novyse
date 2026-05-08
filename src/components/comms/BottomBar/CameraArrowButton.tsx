import React from "react";
import { StyleSheet } from "react-native";
import Icon from "@/src/components/Icon";

import Platform from "@/src/utils/device/type";

interface CameraArrowButtonProps {
  onPress: () => void;
  theme?: {
    background: string;
  };
  isMobile?: boolean;
}

const CameraArrowButton = ({
  onPress,
  theme,
  isMobile = Platform === "mobile",
}: CameraArrowButtonProps) => {
  const styles = createStyles(theme, isMobile);

  return (
    <Icon
      name={isMobile ? "CameraRotated01Icon" : "ArrowDown01Icon"}
      style={[styles.arrowButton, { backgroundColor: theme.background }]}
      onPress={onPress}
    />
  );
};

const createStyles = (
  theme: CameraArrowButtonProps["theme"],
  isMobile: boolean,
) =>
  StyleSheet.create({
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
    },
  });

export default CameraArrowButton;
