import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";
import { useScreen } from "@/context/ScreenContext";
import { useLocalUserContext } from "@/context/LocalUserContext";

import SmartBackground from "@/src/components/SmartBackground";
import BlurredView from "@/src/components/BlurredView";
import Profile from "@/src/components/Profile";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const { isSmallScreen } = useScreen();
  const styles = createStyle(theme, isSmallScreen);

  const { name, surname, username, profilePictureUUID, isLoading } =
    useLocalUserContext();

  if (isLoading) {
    return (
      <SmartBackground style={styles.container}>
        {!isSmallScreen ? (
          <BlurredView style={styles.blurredContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </BlurredView>
        ) : (
          <Text style={styles.loadingText}>Loading profile...</Text>
        )}
      </SmartBackground>
    );
  }

  return (
    <SmartBackground style={styles.container}>
      {!isSmallScreen ? (
        <BlurredView style={styles.blurredContainer}>
          <Profile
            name={name}
            surname={surname}
            username={username}
            profilePictureUUID={profilePictureUUID}
            isOnline={true}
          />
        </BlurredView>
      ) : (
        <Profile
          name={name}
          surname={surname}
          username={username}
          profilePictureUUID={profilePictureUUID}
          isOnline={true}
        />
      )}
    </SmartBackground>
  );
};

const createStyle = (theme, isSmallScreen: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      position: "relative",
      padding: isSmallScreen ? 0 : 10,
    },
    blurredContainer: {
      flex: 1,
      position: "relative",

      borderRadius: isSmallScreen ? 0 : 15,
      overflow: "hidden",
    },
    loadingText: {
      color: theme.text,
      fontSize: 18,
    },
  });

export default ProfilePage;
