import React, { useContext } from "react";
import { StyleSheet, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";

import { useLocalUserContext } from "@/context/LocalUserContext";

import Profile from "@/src/components/Profile";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    userUUID,
    name,
    surname,
    username,
    profilePictureUUID,
    description,
    birthday,
    region,
    country,
    isLoading,
  } = useLocalUserContext();

  if (isLoading) {
    return <Text style={styles.loadingText}>Loading profile...</Text>;
  }

  return (
    <Profile
      uuid={userUUID}
      name={name}
      surname={surname}
      username={username}
      profilePictureUUID={profilePictureUUID}
      description={description}
      birthday={birthday}
      country={country}
      isOnline={true}
    />
  );
};

const createStyle = (theme: any) =>
  StyleSheet.create({
    loadingText: {
      color: theme.text,
      fontSize: 18,
    },
  });

export default ProfilePage;
