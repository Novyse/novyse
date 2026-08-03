import React from "react";
import { router } from "expo-router";
import Section from "@/src/components/features/settings/SettingsSection";
import SettingRow from "@/src/components/features/settings/SettingRow";
import SettingsPageScrollview from "@/src/components/features/settings/SettingsPageScrollview";
import Platform from "@/src/utils/device/type";

interface SettingItem {
  translationKey: string;
  iconName: string;
  navToPage: string;
}

interface SettingSection {
  titleKey?: string;
  items: SettingItem[];
}

const getSections = (): SettingSection[] => {
  const sections: SettingSection[] = [
    {
      titleKey: "settings.account.title",
      items: [
        {
          translationKey: "settings.menu.account",
          iconName: "UserIcon",
          navToPage: "./settings/account",
        },
        {
          translationKey: "settings.menu.security",
          iconName: "BlockedIcon",
          navToPage: "./settings/security",
        },
      ],
    },
    {
      titleKey: "settings.customization.title",
      items: [
        {
          translationKey: "settings.menu.customization",
          iconName: "PencilEdit01Icon",
          navToPage: "./settings/customization",
        },
        {
          translationKey: "settings.menu.comms",
          iconName: "VolumeHighIcon",
          navToPage: "./settings/comms",
        },
        {
          translationKey: "settings.languageAndTime",
          iconName: "GlobalIcon",
          navToPage: "./settings/language",
        },
      ],
    },
    {
      titleKey: "settings.menu.storage",
      items: [
        {
          translationKey: "settings.menu.storage",
          iconName: "Folder01Icon",
          navToPage: "./settings/storage",
        },
        ...(Platform === "mobile"
          ? [
              {
                translationKey: "settings.menu.qrScanner",
                iconName: "QrCode01Icon",
                navToPage: "./settings/qrscanner",
              },
            ]
          : []),
        ...(Platform === "web" || Platform === "desktop"
          ? [
              {
                translationKey: "settings.menu.shortcuts",
                iconName: "KeyboardIcon",
                navToPage: "./settings/shortcuts",
              },
            ]
          : []),
        ...(Platform === "desktop"
          ? [
              {
                translationKey: "settings.menu.system",
                iconName: "ComputerIcon",
                navToPage: "./settings/system",
              },
            ]
          : []),
      ],
    },
    {
      titleKey: "settings.menu.info",
      items: [
        {
          translationKey: "settings.menu.info",
          iconName: "InformationCircleIcon",
          navToPage: "./settings/info",
        },
      ],
    },
  ];

  return sections.filter((section) => section.items.length > 0);
};

const handleNavigate = (navToPage: string) => {
  if (navToPage.startsWith("./")) {
    const page = navToPage.replace("./", "");
    router.push(`/app/${page}` as any);
  } else {
    router.push(navToPage as any);
  }
};

const Settings = () => {
  const sections = getSections();

  return (
    <SettingsPageScrollview paddingTop={15}>
      {sections.map((section, sectionIdx) => (
        <Section key={sectionIdx} titleKey={section.titleKey}>
          {section.items.map((setting, itemIdx) => {
            const isLast = itemIdx === section.items.length - 1;
            return (
              <SettingRow
                key={setting.translationKey}
                labelKey={setting.translationKey}
                iconName={setting.iconName}
                onPress={() => handleNavigate(setting.navToPage)}
                style={isLast ? { borderBottomWidth: 0 } : undefined}
              />
            );
          })}
        </Section>
      ))}
    </SettingsPageScrollview>
  );
};

export default Settings;
