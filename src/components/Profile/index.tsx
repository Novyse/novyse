import React, { useContext } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Banner from "@/src/components/Banner";
import ProfileHeader from "./ProfileHeader";
import AboutMe from "./AboutMe";
import Connections from "./Connections";
import BirthdayLocation from "./BirthdayLocation";

import { ThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";

interface Connection {
  name: string;
  icon: string;
  url?: string;
}

interface ProfileProps {
  uuid: string;
  name: string;
  surname: string;
  username: string;
  birthday?: string;
  country?: string;
  profilePictureUUID?: string;
  bannerUUID?: string;
  isOnline?: boolean;
  description?: string;
  connections?: Connection[];
  onConnectionPress?: (connection: Connection) => void;
  onEditAvatar?: () => void;
}

export default function Profile({
  uuid,
  name,
  surname,
  username,
  birthday,
  country,
  profilePictureUUID,
  bannerUUID,
  isOnline,
  description,
  connections,
  onConnectionPress,
  onEditAvatar,
}: ProfileProps) {
  const { theme } = useContext(ThemeContext);
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
          <Banner theme={theme} size={isSmallScreen ? 120 : 180} />

          <ProfileHeader
            uuid={uuid}
            name={name}
            surname={surname}
            username={username}
            profilePictureUUID={profilePictureUUID}
            isOnline={isOnline}
            onEditAvatar={onEditAvatar}
          />

          {/* About Me Section */}
          <AboutMe description={description} />

          {/* Birthday and Location Section */}
          {birthday ||
            (country && (
              <BirthdayLocation birthday={birthday} country={country} />
            ))}

          {/* Connections Section */}
          {connections && (
            <Connections
              connections={connections}
              onConnectionPress={onConnectionPress}
            />
          )}
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
      minHeight: isSmallScreen ? screenHeight * 0.8 : 500,
    },
  });
