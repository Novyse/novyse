import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";
import Database from "../utils/storage/database";
import SettingsPageScrollview from "../components/settings/SettingsPageScrollview";
import SettingsCard from "../components/settings/SettingsCard";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [userData, setUserData] = useState({
    name: "",
    surname: "",
    handle: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const database = await Database.create();
      const user = await database.getLocalUser();
      if (user) {
        setUserData({
          name: user.name || "",
          surname: user.surname || "",
          handle: user.handle || "",
          email: user.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const ProfileField = ({ label, value }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueContainer}>
        <Text style={styles.fieldValue}>{value || "Loading..."}</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.container}>
          <HeaderWithBackArrow goBackTo="../" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <HeaderWithBackArrow goBackTo="../" />
      <SettingsPageScrollview>
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: "https://picsum.photos/200" }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.profileName}>
            {userData.name && userData.surname
              ? `${userData.name} ${userData.surname}`
              : "Loading..."}
          </Text>
          <Text style={styles.profileHandle}>
            {userData.handle ? `@${userData.handle}` : "Loading..."}
          </Text>
        </View>

        {/* User Information Section */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ProfileField label="Name" value={userData.name} />
          <ProfileField label="Surname" value={userData.surname} />
          <ProfileField label="Handle" value={userData.handle} />
          <ProfileField label="Email" value={userData.email} />
        </SettingsCard>
      </SettingsPageScrollview>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
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
    profileImage: {
      width: 110,
      height: 110,
      borderRadius: 55,
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
  });

export default ProfilePage;
