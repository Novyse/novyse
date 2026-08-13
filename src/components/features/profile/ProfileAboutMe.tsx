import { View, StyleSheet } from "react-native";

import Typography from "@/src/components/ui/typography/Typography";
import BlurredView from "@/src/components/layout/BlurredView";

interface ProfileAboutMeProps {
  biography?: string;
}

export default function ProfileAboutMe({ biography }: ProfileAboutMeProps) {
  const styles = createStyles();

  console.log("biography", biography);

  return (
    <View style={styles.container}>
      <BlurredView style={styles.glassCard}>
        <View style={styles.content}>
          {/* @MatteoMagnani7 magari mettere una Label.tsx */}
          <Typography
            size="sm"
            weight="semibold"
            translationKey="profile.aboutMe.title"
          />
          <Typography
            size="sm"
            variant="subtitle"
            text={biography}
            translationKey={"profile.aboutMe.noDescription"}
          />
        </View>
      </BlurredView>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      padding: 15,
    },
    glassCard: {
      borderRadius: 25,
      overflow: "hidden",
    },
    content: {
      padding: 15,
    },
  });
