import { StyleSheet } from "react-native";
import Icon from "@/src/components/Icon";

interface CommsBottomBarButtonProps {
  onPress: () => void;
  iconName: string;
  iconColor: string;
  hoverColor?: string;
}

const CommsBottomBarButton = ({
  onPress,
  iconName,
  iconColor,
  hoverColor,
}: CommsBottomBarButtonProps) => {
  const styles = createStyle();

  return (
    <Icon
      name={iconName}
      color={iconColor}
      style={styles.iconButton}
      onPress={onPress}
      hoverColor={hoverColor}
    />
  );
};

const createStyle = () =>
  StyleSheet.create({
    iconButton: {
      borderRadius: 100,
      height: 45,
      width: 45,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CommsBottomBarButton;
