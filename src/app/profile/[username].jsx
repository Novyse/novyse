import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";

import Profile from "@/src/components/Profile";

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
  const [description, setDescription] = useState("");
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
    setDescription(userData.description);
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
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Error loading profile: {error}</Text>
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
          description={description}
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
      borderRadius: 15,
      overflow: "hidden",
      backgroundColor: theme.backgroundMainGradient[0],
      margin: 10,
      width: "50%",
      alignSelf: "center",
    },
  });

export default ProfilePage;
