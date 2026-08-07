import { useContext } from "react";
import { View, StyleSheet } from "react-native";

import AppText from "@/src/components/ui/text/AppText";
import BlurredView from "@/src/components/layout/BlurredView";

import { ThemeContext } from "@/src/context/ThemeContext";

interface ProfileAboutMeProps {
  biography?: string;
}

export default function ProfileAboutMe({ biography }: ProfileAboutMeProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <BlurredView style={styles.glassCard}>
        <View style={styles.content}>
          <AppText
            style={styles.title}
            translationKey="profile.aboutMe.title"
          />
          <AppText
            style={styles.description}
            text={biography}
            translationKey={"profile.aboutMe.noDescription"}
          />
        </View>
      </BlurredView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    glassCard: {
      borderRadius: 15,
      overflow: "hidden",
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    title: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.text,
      letterSpacing: 1,
      marginBottom: 12,
      opacity: 0.7,
    },
    description: {
      fontSize: 14,
      color: theme.subtitle,
      lineHeight: 20,
    },
  });
