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
                id: 'first_name',
                title: (l) => l.name,
                subtitle: (l) => l.nameHint,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'profileFirstName',
              ),
              SettingItem(
                id: 'last_name',
                title: (l) => l.surname,
                subtitle: (l) => l.surnameHint,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'profileLastName',
              ),
            ],
          ),
          SettingGroup(
            id: 'profile_bio',
            title: (l) => l.settingsGroupProfileBioTitle,
            items: [
              SettingItem(
                id: 'biography',
                title: (l) => l.biography,
                subtitle: (l) => l.biographyHint,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'profileBiography',
              ),
            ],
          ),
          SettingGroup(
            id: 'profile_more',
            title: (l) => l.settingsGroupProfileMoreTitle,
            items: [
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
          SettingGroup(
            id: 'profile_media',
            title: (l) => l.settingsGroupProfileMediaTitle,
            items: [
              SettingItem(
                id: 'avatar',
                title: (l) => l.settingsItemAvatarTitle,
                subtitle: (l) => l.settingsItemAvatarSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'avatarEditor',
              ),
              SettingItem(
                id: 'profile_banner',
                title: (l) => l.settingsItemBannerTitle,
                subtitle: (l) => l.settingsItemBannerSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'bannerEditor',
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
