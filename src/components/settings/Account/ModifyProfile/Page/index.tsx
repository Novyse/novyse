import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Banner from "@/src/components/Banner";
import ProfileHeader from "@/src/components/Profile/ProfileHeader";
import FormSection from "@/src/components/settings/Account/ModifyProfile/Page/FormSection";

import { useThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

interface ModifyProfileProps {
  name: string;
  surname: string;
  username: string;
  email: string;
  birthday: string;
  country: string;
  profilePictureUUID?: string;
}

export default function ModifyProfile({
  name,
  surname,
  username,
  email,
  birthday,
  country,
  profilePictureUUID,
}: ModifyProfileProps) {
  const { theme } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const { isSmallScreen } = useScreen();

  const styles = createStyles(theme, isSmallScreen, height);
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Glass Card Container */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"]}
          style={styles.glassPanel}
        >
          <Banner
            theme={theme}
            size={isSmallScreen ? 120 : 180}
            onEdit={() => {}}
          />

          <ProfileHeader
            name={name}
            surname={surname}
            profilePictureUUID={profilePictureUUID}
            username={username}
            badges={[
              {
                text: "Pro Member",
                color: "rgba(16, 185, 129, 0.1)",
                icon: "FirstBracketCircleIcon",
              },
              {
                text: "Artist",
                color: "rgba(168, 85, 247, 0.1)",
                icon: "SevenZ01Icon",
              },
            ]}
            onEditAvatar={() => {}}
          />

          <FormSection
            name={name}
            surname={surname}
            username={username}
            birthday={birthday}
            country={country}
            isSmallScreen={isSmallScreen}
          />

          {/* Spacer for bottom footer */}
          <View style={{ height: 20 }} />
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const createStyles = (
  theme: any,
  isSmallScreen: boolean,
  screenHeight: number,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: isSmallScreen ? 0 : 16,
      alignItems: "center",
      paddingTop: isSmallScreen ? 80 : 80,
      paddingBottom: isSmallScreen ? 10 : 20,
    },
    glassPanel: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
      backgroundColor: "rgba(30, 41, 59, 0.4)",
      overflow: "hidden",
      width: isSmallScreen ? "100%" : "90%",
      maxWidth: 600,
      minHeight: isSmallScreen ? screenHeight * 0.8 : 800,
    },
  });
