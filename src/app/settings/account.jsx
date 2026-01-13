import React, { useContext, useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import Database from "@/src/utils/storage/database";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import Icon from "@/src/components/Icon";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const [userData, setUserData] = useState({
    name: "",
    surname: "",
    handle: "",
    email: "",
    profileImageUri: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

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
          profileImageUri: user.profileImageUri || "https://picsum.photos/200", // Default or from user
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
      <ScreenLayout fullscreen={true}>
        <View style={styles.container}>
          <HeaderWithBackArrow title={"Account"}/>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenLayout>
    );
  }
  const pickImage = () => {
    Alert.alert("Change Profile Image", "This feature is coming soon!");
  };

  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Account"}/>
      <SettingsPageScrollview>
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.profileImageContainer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Image
              source={{ uri: userData.profileImageUri }}
              style={[styles.profileImage, { opacity: isHovered ? 0.5 : 1 }]}
            />
            {isHovered && (
              <View style={styles.editIconContainer}>
                <Icon name="PencilEdit02Icon" size={24} color={theme.text} />
              </View>
            )}
          </TouchableOpacity>
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
          <ProfileField label="Username" value={userData.handle} />
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
    editIconContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    },
  });

export default ProfilePage;
