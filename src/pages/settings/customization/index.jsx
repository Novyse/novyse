import React from "react";
import SettingsMenuItem from "@/src/components/settings/SettingsMenuItem";
import HeaderWithBackArrow from "@/src/components/HeaderWithBackArrow";
import SettingsPageScrollview from "@/src/components/settings/SettingsPageScrollview";

const PrivacyAndSecurityMenu = ({ navigation }) => {
  const onBack = () => navigation.goBack();

  return (
    <>
      <HeaderWithBackArrow title={"Customization"} onBack={onBack} />
      <SettingsPageScrollview isMenu={true}>
        <SettingsMenuItem
          navToPage="./customization/themes"
          pageName="Themes"
          iconName={"PaintBoardIcon"}
        />
      </SettingsPageScrollview>
    </>
  );
};

export default PrivacyAndSecurityMenu;
