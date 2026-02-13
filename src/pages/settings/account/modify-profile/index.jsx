import React, { useContext, useState } from "react";
import { StyleSheet, View, Text } from "react-native";

import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import ScreenLayout from "@/src/components/ScreenLayout";
import UploadProfilePicture from "@/src/components/modals/UploadProfilePicture";

import Page from "@/src/components/settings/account/modify-profile/Page";

const ProfilePage = ({ navigation }) => {
  const onBack = () => navigation.goBack();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { name, surname, handle, email, profilePictureUUID, isLoading } =
    useContext(LocalUserContext);

  const [isProfilePicModalVisible, setIsProfilePicModalVisible] =
    useState(false);

  if (isLoading) {
    return (
      <ScreenLayout fullscreen={true}>
        <View style={styles.container}>
          <HeaderWithBackArrow title={"Account"} onBack={() => onBack()} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout fullscreen={true}>
      <HeaderWithBackArrow title={"Account"} onBack={() => onBack()} />
      <Page
        name={name}
        surname={surname}
        username={handle}
        email={email}
        profilePictureUUID={profilePictureUUID}
        onEditAvatar={() => setIsProfilePicModalVisible(true)}
      />
      <UploadProfilePicture
        visible={isProfilePicModalVisible}
        onClose={() => {
          setIsProfilePicModalVisible(false);
        }}
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
