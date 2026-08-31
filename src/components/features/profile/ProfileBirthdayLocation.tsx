import { useContext } from "react";
import { View, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { LinearGradient } from "expo-linear-gradient";

import { ThemeContext } from "@/src/context/ThemeContext";
import Icon from "@/src/components/ui/icon/Icon";

interface ProfileBirthdayLocationProps {
  birthday?: string;
  country?: string;
}

export default function ProfileBirthdayLocation({
  birthday,
  country,
}: ProfileBirthdayLocationProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);

  // Non renderizzare se entrambi non sono presenti
  if (!birthday && !country) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.backgroundMainGradient}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          {birthday && (
            <View style={styles.item}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Icon name="BirthdayCakeIcon" size={16} />
              </View>
              <View style={styles.textContainer}>
                <Typography translationKey="profile.birthdayLocation.born" />
                <Typography text={birthday} />
              </View>
            </View>
          )}

          {country && (
            <View
              style={[
                styles.item,
                birthday && {
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: theme.borderColor,
                  paddingTop: 16,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Icon name="Location06Icon" size={16} />
              </View>
              <View style={styles.textContainer}>
                <Typography translationKey="profile.birthdayLocation.location" />
                <Typography text={country} />
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
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
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
    },
  });
