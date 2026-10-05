import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Account settings.
final List<SettingCategory> accountCategory = [
  SettingCategory(
    id: 'account',
    title: (l) => l.settingsCategoryAccountTitle,
    subtitle: (l) => l.settingsCategoryAccountSubtitle,
    icon: HugeIcons.strokeRoundedSmile,
    pages: [
      SettingPage(
        id: 'account_profile',
        title: (l) => l.settingsPageAccountProfileTitle,
        subtitle: (l) => l.settingsPageAccountProfileSubtitle,
        groups: [
          SettingGroup(
            id: 'profile_fields',
            title: (l) => l.settingsGroupProfileFieldsTitle,
            items: [
              SettingItem(
                id: 'display_name',
                title: (l) => l.settingsItemDisplayNameTitle,
                subtitle: (l) => l.settingsItemDisplayNameSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'profileEditor',
                disabled: true,
              ),
              SettingItem(
                id: 'avatar_banner',
                title: (l) => l.settingsItemAvatarBannerTitle,
                subtitle: (l) => l.settingsItemAvatarBannerSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'avatarEditor',
                disabled: true,
              ),
              SettingItem(
                id: 'bio_status',
                title: (l) => l.settingsItemBioStatusTitle,
                subtitle: (l) => l.settingsItemBioStatusSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'profileEditor',
                disabled: true,
              ),
              SettingItem(
                id: 'name_color',
                title: (l) => l.settingsItemNameColorTitle,
                subtitle: (l) => l.settingsItemNameColorSubtitle,
                component: SettingComponent.colorPicker,
                settingKey: 'account.nameColor',
                scope: SettingScope.synchronized,
                defaultValue: '#0F6FFF',
                disabled: true,
              ),
              SettingItem(
                id: 'linked_contacts',
                title: (l) => l.settingsItemLinkedContactsTitle,
                subtitle: (l) => l.settingsItemLinkedContactsSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'linkedContacts',
                disabled: true,
              ),
            ],
          ),
        ],
      ),
    ],
    items: [
      SettingItem(
        id: 'logout',
        title: (l) => l.settingsItemLogoutTitle,
        subtitle: (l) => l.settingsItemLogoutSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'logout',
      ),
      SettingItem(
        id: 'delete_profile',
        title: (l) => l.settingsItemDeleteProfileTitle,
        subtitle: (l) => l.settingsItemDeleteProfileSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.synchronized,
        actionId: 'deleteProfile',
        danger: true,
      ),
    ],
  ),
];
