import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";
import HoverAndPressedButton from "@/src/components/ui/button/HoverAndPressedButton";

const ChatTypeButtom = ({
  id,
  icon,
  title,
  titleKey,
  subtitle,
  subtitleKey,
  selected,
  onSelect,
  theme,
  disabled,
}) => {
  const styles = createStyles(theme);
  return (
    <HoverAndPressedButton
      style={[styles.card, selected === id && styles.cardSelected]}
      onPress={() => onSelect(id)}
      disabled={disabled}
    >
      <View style={styles.cardIconContainer}>
        <Icon name={icon} />
      </View>
      <Typography
        size="sm"
        weight="semibold"
        translationKey={titleKey}
        text={title}
      />
      <Typography
        style={styles.cardSubtitle}
        size="xs"
        weight="regular"
        variant={selected === id ? "default" : "subtitle"}
        translationKey={subtitleKey}
        text={subtitle}
      />
    </HoverAndPressedButton>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: theme.backgroundCard,
      borderRadius: 25,
      padding: 10,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    cardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    cardIconContainer: {
      marginBottom: 10,
    },
    cardSubtitle: {
      textAlign: "center",
    },
  });

export default ChatTypeButtom;
