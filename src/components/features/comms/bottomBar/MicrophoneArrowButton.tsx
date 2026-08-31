import { useContext } from "react";
import { StyleSheet } from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface MicrophoneArrowButtonProps {
  onPress: () => void;
  isMobile?: boolean;
}

const MicrophoneArrowButton = ({
  onPress,
  isMobile = false,
}: MicrophoneArrowButtonProps) => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <Icon
      name={isMobile ? "Refresh03Icon" : "ArrowDown01Icon"}
      size={18}
      style={styles.arrowButton}
      onPress={onPress}
    />
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    arrowButton: {
      position: "absolute",
      top: -5,
      right: -5,
      width: 18,
      height: 18,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.backgroundMain,
    },
  });

export default MicrophoneArrowButton;
