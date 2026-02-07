import React, { useContext } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Banner from "./Banner";
import ProfileHeader from "./ProfileHeader";
import FormSection from "./FormSection";

import { ThemeContext } from "@/context/ThemeContext";

interface ModifyProfileProps {
  name: string;
  surname: string;
  username: string;
  email: string;
  profilePictureUUID?: string;
}

export default function ModifyProfile({
  name,
  surname,
  username,
  email,
  profilePictureUUID,
}: ModifyProfileProps) {
  const { theme } = useContext(ThemeContext);
  const styles = createStyles(theme);
  return (
    <View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Glass Card Container */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.03)", "rgba(255, 255, 255, 0.01)"]}
          style={styles.glassPanel}
        >
          <Banner />

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
          />

          <FormSection
            name={name}
            surname={surname}
            username={username}
            email={email}
          />

          {/* Spacer for bottom footer */}
          <View style={{ height: 20 }} />
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 0,
      alignItems: "center",
      paddingTop: 80,
    },
    glassPanel: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
      backgroundColor: "rgba(30, 41, 59, 0.4)",
      overflow: "hidden",
      minHeight: 800,
    },
  });
