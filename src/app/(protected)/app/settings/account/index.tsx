import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";
import DeleteAccount from "@/src/components/modalSheets/DeleteAccount";

import auth from "@/src/utils/welcome/auth";

export default function AccountRoute() {
  const onBack = () => router.canGoBack() ? router.back() : router.push("/app");
  const router = useRouter();

  const [isDeleteAccountModalVisible, setIsDeleteAccountModalVisible] =
    useState(false);

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow translationKey="settings.account.title" onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./settings/account/modify-profile"
          translationKey="settings.account.modifyProfile"
          iconName={"UserEdit01Icon"}
        />
        <SettingsMenuItem
          translationKey="settings.account.logout"
          iconName={"Logout03Icon"}
          onPress={async () => {
            await auth.logout();
            router.replace("/welcome");
          }}
        />
        <SettingsMenuItem
          translationKey="settings.account.deleteAccount"
          iconName={"Delete02Icon"}
          nameColor={"red"}
          iconColor={"red"}
          onPress={async () => {
            setIsDeleteAccountModalVisible(true);
          }}
        />
      </SettingsPageScrollview>
      <DeleteAccount
        visible={isDeleteAccountModalVisible}
        onClose={() => setIsDeleteAccountModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
