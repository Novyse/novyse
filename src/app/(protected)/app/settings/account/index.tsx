import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingsRow";
import DeleteAccount from "@/src/components/modalSheets/DeleteAccount";

import auth from "@/src/utils/welcome/auth";

export default function AccountRoute() {
  const router = useRouter();
  const onBack = () =>
    router.canGoBack() ? router.back() : router.push("/app");

  const [isDeleteAccountModalVisible, setIsDeleteAccountModalVisible] =
    useState(false);

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow
        translationKey="settings.account.title"
        onBack={onBack}
      />
      <SettingsPageScrollview>
        <Section>
          <SettingRow
            iconName="UserEdit01Icon"
            labelKey="settings.account.modifyProfile"
            onPress={() => router.push("/app/settings/account/modify-profile")}
          />
          <SettingRow
            iconName="Logout03Icon"
            labelKey="settings.account.logout"
            onPress={async () => {
              await auth.logout();
              router.replace("/welcome");
            }}
          />
          <SettingRow
            iconName="Delete02Icon"
            labelKey="settings.account.deleteAccount"
            danger={true}
            onPress={() => setIsDeleteAccountModalVisible(true)}
            style={{ borderBottomWidth: 0 }}
          />
        </Section>
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
