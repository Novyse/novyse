import React, { useContext, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { router } from "expo-router";

import { ThemeContext } from "@/context/ThemeContext";
import { LocalUserContext } from "@/context/LocalUserContext";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import UploadProfilePicture from "@/src/components/modalSheets/UploadProfilePicture";

import Page from "@/src/components/settings/account/modify-profile/Page";

export default function AccountModifyRoute() {
  const onBack = () => router.back();
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const {
    name,
    surname,
    handle,
    email,
    profilePictureUUID,
    description,
    birthday,
    region,
    country,
    isLoading,
  } = useContext(LocalUserContext);

  const [isProfilePicModalVisible, setIsProfilePicModalVisible] =
    useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <HeaderWithBackArrow title={"Account"} onBack={() => onBack()} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <HeaderWithBackArrow title={"Account"} onBack={() => onBack()} />
      <Page
        name={name}
        surname={surname}
        username={handle}
        email={email}
        profilePictureUUID={profilePictureUUID}
        description={description}
        birthday={birthday}
        region={region}
        country={country}
        onEditAvatar={() => setIsProfilePicModalVisible(true)}
      />
      <UploadProfilePicture
        visible={isProfilePicModalVisible}
        onClose={() => {
          setIsProfilePicModalVisible(false);
        }}
      />
    </>
  );
}

const createStyle = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingText: {
      color: theme.text,
      fontSize: 16,
      textAlign: "center",
      marginTop: 50,
    },
  });
