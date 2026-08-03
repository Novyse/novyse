import React, { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface SpeakerArrowButtonProps {
  onPress: () => void;
}

const SpeakerArrowButton = ({ onPress }: SpeakerArrowButtonProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <Icon
      name={"ArrowDown01Icon"}
      style={[styles.arrowButton, { backgroundColor: theme.backgroundMain }]}
      onPress={onPress}
    />
  );
};

const createStyles = (theme: any) =>
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
      borderColor: theme.borderColor,
    },
  });

export default SpeakerArrowButton;
