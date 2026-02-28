import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";

import ScreenLayout from "@/src/components/ScreenLayout";
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
      <ScreenLayout fullscreen={true}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout fullscreen={true}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Error loading profile: {error}</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout fullscreen={true}>
      <Profile
        uuid={uuid}
        name={name}
        surname={surname}
        username={username}
        profilePictureUUID={profilePictureUUID}
        description={description}
        isOnline={true}
      />
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 80,
    },
    profileImageSection: {
      alignItems: "center",
      paddingVertical: 30,
      marginBottom: 20,
    },
    profileImageContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.backgroundSettingsCards,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
      borderWidth: 3,
      borderColor: theme.primary,
      overflow: "hidden",
    },
    profileName: {
      color: theme.text,
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 5,
    },
    profileHandle: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 20,
    },
    fieldContainer: {
      marginBottom: 20,
    },
    fieldLabel: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    fieldValueContainer: {
      backgroundColor: theme.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    fieldValue: {
      color: theme.text,
      fontSize: 16,
    },
    editIconContainer: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
  });

export default ProfilePage;
