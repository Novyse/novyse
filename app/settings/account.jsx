import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Image } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "../components/HeaderWithBackArrow";
import ScreenLayout from "../components/ScreenLayout";
import localDatabase from "../utils/localDatabaseMethods";

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
      const localUserData = await localDatabase.fetchLocalUserData();
      if (localUserData) {
        setUserData({
          name: localUserData.name || "",
          surname: localUserData.surname || "",
          handle: localUserData.handle || "",
          email: localUserData.user_email || "",
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
        <Text style={styles.fieldValue}>{value || "Not set"}</Text>
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
      <ScrollView style={styles.container}>
        <HeaderWithBackArrow goBackTo="../" />

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
              : "User Profile"}
          </Text>
          <Text style={styles.profileHandle}>
            {userData.handle ? `@${userData.handle}` : "@username"}
          </Text>
        </View>

        {/* User Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <ProfileField label="Name" value={userData.name} />
          <ProfileField label="Surname" value={userData.surname} />
          <ProfileField label="Handle" value={userData.handle} />
          <ProfileField label="Email" value={userData.email} />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const createStyle = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
    },
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
      backgroundColor: theme.cardBackground || "#23232b",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
      borderWidth: 3,
      borderColor: theme.primary || "#4f8cff",
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
      color: theme.subtitle || "#b0b0b0",
      fontSize: 16,
      textAlign: "center",
    },
    infoSection: {
      backgroundColor: theme.cardBackground || "#23232b",
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
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
      color: theme.subtitle || "#b0b0b0",
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    fieldValueContainer: {
      backgroundColor: theme.inputBackground || "#1a1d29",
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.borderColor || "#333",
    },
    fieldValue: {
      color: theme.text,
      fontSize: 16,
    },
  });

export default ProfilePage;