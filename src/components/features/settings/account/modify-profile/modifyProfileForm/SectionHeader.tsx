import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";

interface SectionHeaderProps {
  title?: string;
  translationKey?: string;
  icon: string;
}

export default function SectionHeader({
  title,
  translationKey,
  icon,
}: SectionHeaderProps) {
  const styles = createStyles();

  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} />
      {translationKey ? (
        <Typography translationKey={translationKey} />
      ) : title ? (
        <Typography text={title} />
      ) : null}
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 10,
    },
  });
