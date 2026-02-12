import React from "react";
import { View, StyleSheet } from "react-native";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const AccountMenu = ({ navigation }) => {
  const onBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <HeaderWithBackArrow title={"Account"} onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./account/modify-profile"
          pageName="Modify Profile"
          iconName={"UserEdit01Icon"}
        />
      </SettingsPageScrollview>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AccountMenu;
