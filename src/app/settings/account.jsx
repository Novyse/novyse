import React, { useContext, useState } from "react";
import { StyleSheet, View, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import Database from "@/src/utils/storage/database";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import SettingsCard from "@/src/components/settings/SettingsCard";
import Icon from "@/src/components/Icon";
import HoverAndPressedButton from "@/src/components/HoverAndPressedButton";
import UploadProfilePicture from "@/src/components/modals/UploadProfilePicture";
import Avatar from "@/src/components/Avatar";

const ProfilePage = () => {
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { name, surname, handle, email, profilePictureUUID, isLoading } = useContext(LocalUserContext);

  const [isHovered, setIsHovered] = useState(false);
  const [isProfilePicModalVisible, setIsProfilePicModalVisible] =
    useState(false);

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
          <HeaderWithBackArrow title={"Account"} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenLayout>
    );
  }
  const pickImage = () => {
    setIsProfilePicModalVisible(true);
  };

  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Account"} />
      <SettingsPageScrollview>
        <UploadProfilePicture
          visible={isProfilePicModalVisible}
          onClose={() => {
            setIsProfilePicModalVisible(false);
          }}
        />
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <HoverAndPressedButton
            onPress={pickImage}
            style={styles.profileImageContainer}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Avatar uuid={profilePictureUUID} size={120}  theme={theme} />
            {isHovered && (
              <View style={styles.editIconContainer}>
                <Icon name="PencilEdit02Icon" size={24} color={theme.text} />
              </View>
            )}
          </HoverAndPressedButton>
          <Text style={styles.profileName}>
            {name && surname ? `${name} ${surname}` : "Loading..."}
          </Text>
          <Text style={styles.profileHandle}>
            {handle ? `@${handle}` : "Loading..."}
          </Text>
        </View>

        {/* User Information Section */}
        <SettingsCard>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <ProfileField label="Name" value={name} />
          <ProfileField label="Surname" value={surname} />
          <ProfileField label="Username" value={handle} />
          <ProfileField label="Email" value={email} />
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
