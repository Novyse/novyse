import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";

import Profile from "@/src/components/profile";
import AppText from "@/src/components/ui/text/AppText";

import database from "@/src/utils/storage/database";
import gateway from "@/src/utils/backend-services/api-gateway";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  // pick username from url /profile/:username
  const { username } = useLocalSearchParams();

  const [uuid, setUuid] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [profilePictureUUID, setProfilePictureUUID] = useState("");
  const [biography, setBiography] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserDataFromDatabase = async () => {
    return await database.user.get.byHandle(username);
  };

  const fetchUserDataFromAPI = async () => {
    try {
      const { success, user: userData } =
        await gateway.user.profile.get.byHandle(username);
      console.log(userData);
      if (success && userData) {
        return userData;
      }
    } catch (err) {
      console.error("Error fetching user data from API:", err);
      setError(err.message);
    }
  };

  const addDataToState = (userData) => {
    setUuid(userData.uuid);
    setName(userData.name);
    setSurname(userData.surname);
    setProfilePictureUUID(userData.profilePictureUUID);
    setBiography(userData.biography);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        let userData = await fetchUserDataFromDatabase();
        if (!userData) userData = await fetchUserDataFromAPI();
        if (!userData) {
          setError("User not found.");
          return;
        }

        addDataToState(userData);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppText style={styles.loadingText} translationKey="profile.loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <AppText
          style={styles.loadingText}
          translationKey="profile.error"
          translationOptions={{
            error: typeof error === "string" ? error : error.message,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <Profile
          uuid={uuid}
          name={name}
          surname={surname}
          username={username}
          profilePictureUUID={profilePictureUUID}
          biography={biography}
          isOnline={true}
        />
      </View>
    </View>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundMainGradient[0],
    },
    profileContainer: {
      flex: 1,
      position: "relative",
      overflow: "hidden",
      backgroundColor: theme.backgroundMainGradient[0],
      width: "100%",
      maxWidth: 1024,
      alignSelf: "center",
    },
  });

export default ProfilePage;
