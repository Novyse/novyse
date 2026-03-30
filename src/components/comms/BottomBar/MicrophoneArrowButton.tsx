import React from "react";
import { StyleSheet } from "react-native";
import Icon from "@/src/components/Icon";

interface MicrophoneArrowButtonProps {
  onPress: () => void;
  theme?: {
    background: string;
  };
}

const MicrophoneArrowButton = ({
  onPress,
  theme,
}: MicrophoneArrowButtonProps) => {
  return (
    <Icon
      name={"ArrowDown01Icon"}
      style={[styles.arrowButton, { backgroundColor: theme?.background }]}
      onPress={onPress}
    />
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
  },
});

export default MicrophoneArrowButton;
