import React, { useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import AppText from "@/src/components/ui/text/AppText";
import { router } from "expo-router";

import { ThemeContext } from "@/src/context/ThemeContext";
import useUserStore from "@/src/context/UserContext";

import HeaderWithBackArrow from "@/src/components/features/header/HeaderWithBackArrow";
import UploadProfilePicture from "@/src/components/modalSheets/UploadProfilePicture";

import Page from "@/src/components/features/settings/account/modify-profile/ModifyProfilePanel";

export default function AccountModifyRoute() {
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const { localUserUUID, getUser, loading } = useUserStore();
  const user = localUserUUID ? getUser(localUserUUID) : null;

  const [isProfilePicModalVisible, setIsProfilePicModalVisible] =
    useState(false);

  if (loading || !user) {
    return (
      <View style={styles.container}>
        <HeaderWithBackArrow
          translationKey="settings.account.title"
          onBack={() => onBack()}
        />
        <AppText
          style={styles.loadingText}
          translationKey="common.loadingProfile"
        />
      </View>
    );
  }

  return (
    <>
      <HeaderWithBackArrow
        translationKey="settings.account.title"
        onBack={() => onBack()}
      />
      <Page
        name={user.name}
        surname={user.surname}
        username={user.handle}
        email={user.email ?? ""}
        profilePictureUUID={user.profilePictureUUID ?? ""}
        biography={user.biography ?? ""}
        birthday={user.birthday ?? ""}
        region={user.region ?? ""}
        country={user.country ?? ""}
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
