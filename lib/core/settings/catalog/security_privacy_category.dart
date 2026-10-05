import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Security & Privacy settings.
final List<SettingCategory> securityPrivacyCategory = [
  SettingCategory(
    id: 'security',
    title: (l) => l.settingsCategorySecurityTitle,
    subtitle: (l) => l.settingsCategorySecuritySubtitle,
    icon: HugeIcons.strokeRoundedShield01,
    pages: [
      SettingPage(
        id: 'security_auth',
        title: (l) => l.settingsPageSecurityAuthTitle,
        subtitle: (l) => l.settingsPageSecurityAuthSubtitle,
        groups: [
          SettingGroup(
            id: 'password_security',
            title: (l) => l.settingsGroupPasswordSecurityTitle,
            items: [
              SettingItem(
                id: 'password',
                title: (l) => l.settingsItemPasswordTitle,
                subtitle: (l) => l.settingsItemPasswordSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'passwordManager',
              ),
              SettingItem(
                id: 'mfa',
                title: (l) => l.settingsItemMfaTitle,
                subtitle: (l) => l.settingsItemMfaSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'mfaSetup',
                disabled: true,
              ),
              SettingItem(
                id: 'auth_sessions',
                title: (l) => l.settingsItemAuthSessionsTitle,
                subtitle: (l) => l.settingsItemAuthSessionsSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'sessionAuditor',
              ),
              SettingItem(
                id: 'api_keys',
                title: (l) => l.settingsItemApiKeysTitle,
                subtitle: (l) => l.settingsItemApiKeysSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'apiKeys',
              ),
              SettingItem(
                id: 'biometric_lock',
                title: (l) => l.settingsItemBiometricLockTitle,
                subtitle: (l) => l.settingsItemBiometricLockSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'security.biometricLock',
                scope: SettingScope.local,
                defaultValue: false,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'security_privacy',
        title: (l) => l.settingsPageSecurityPrivacyTitle,
        subtitle: (l) => l.settingsPageSecurityPrivacySubtitle,
        groups: [
          SettingGroup(
            id: 'visibility',
            title: (l) => l.settingsGroupVisibilityTitle,
            items: [
              SettingItem(
                id: 'last_seen',
                title: (l) => l.settingsItemLastSeenTitle,
                subtitle: (l) => l.settingsItemLastSeenSubtitle,
                component: SettingComponent.select,
                settingKey: 'privacy.lastSeen',
                scope: SettingScope.synchronized,
                defaultValue: 'contacts',
                options: [
                  SettingOption(
                    'everyone',
                    (l) => l.settingsOptionLastSeenEveryoneLabel,
                  ),
                  SettingOption(
                    'contacts',
                    (l) => l.settingsOptionLastSeenContactsLabel,
                  ),
                  SettingOption(
                    'nobody',
                    (l) => l.settingsOptionLastSeenNobodyLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'profile_photo_visibility',
                title: (l) => l.settingsItemProfilePhotoVisibilityTitle,
                subtitle: (l) => l.settingsItemProfilePhotoVisibilitySubtitle,
                component: SettingComponent.select,
                settingKey: 'privacy.profilePhoto',
                scope: SettingScope.synchronized,
                defaultValue: 'contacts',
                options: [
                  SettingOption(
                    'everyone',
                    (l) => l.settingsOptionProfilePhotoVisibilityEveryoneLabel,
                  ),
                  SettingOption(
                    'contacts',
                    (l) => l.settingsOptionProfilePhotoVisibilityContactsLabel,
                  ),
                  SettingOption(
                    'nobody',
                    (l) => l.settingsOptionProfilePhotoVisibilityNobodyLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'bio_visibility',
                title: (l) => l.settingsItemBioVisibilityTitle,
                subtitle: (l) => l.settingsItemBioVisibilitySubtitle,
                component: SettingComponent.select,
                settingKey: 'privacy.bio',
                scope: SettingScope.synchronized,
                defaultValue: 'contacts',
                options: [
                  SettingOption(
                    'everyone',
                    (l) => l.settingsOptionBioVisibilityEveryoneLabel,
                  ),
                  SettingOption(
                    'contacts',
                    (l) => l.settingsOptionBioVisibilityContactsLabel,
                  ),
                  SettingOption(
                    'nobody',
                    (l) => l.settingsOptionBioVisibilityNobodyLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'birthday_visibility',
                title: (l) => l.settingsItemBirthdayVisibilityTitle,
                subtitle: (l) => l.settingsItemBirthdayVisibilitySubtitle,
                component: SettingComponent.select,
                settingKey: 'privacy.birthday',
                scope: SettingScope.synchronized,
                defaultValue: 'contacts',
                options: [
                  SettingOption(
                    'everyone',
                    (l) => l.settingsOptionBirthdayVisibilityEveryoneLabel,
                  ),
                  SettingOption(
                    'contacts',
                    (l) => l.settingsOptionBirthdayVisibilityContactsLabel,
                  ),
                  SettingOption(
                    'nobody',
                    (l) => l.settingsOptionBirthdayVisibilityNobodyLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'read_receipts',
                title: (l) => l.settingsItemReadReceiptsTitle,
                subtitle: (l) => l.settingsItemReadReceiptsSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'privacy.readReceipts',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'forward_attribution',
                title: (l) => l.settingsItemForwardAttributionTitle,
                subtitle: (l) => l.settingsItemForwardAttributionSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'privacy.forwardAttribution',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'call_routing',
                title: (l) => l.settingsItemCallRoutingTitle,
                subtitle: (l) => l.settingsItemCallRoutingSubtitle,
                component: SettingComponent.select,
                settingKey: 'privacy.callRouting',
                scope: SettingScope.synchronized,
                defaultValue: 'relay',
                options: [
                  SettingOption(
                    'p2p',
                    (l) => l.settingsOptionCallRoutingP2pLabel,
                  ),
                  SettingOption(
                    'relay',
                    (l) => l.settingsOptionCallRoutingRelayLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'blocked_users',
                title: (l) => l.settingsItemBlockedUsersTitle,
                subtitle: (l) => l.settingsItemBlockedUsersSubtitle,
                component: SettingComponent.custom,
                settingKey: 'security.blockedUsers',
                scope: SettingScope.synchronized,
                defaultValue: '[]',
                customRendererId: 'blockedUsers',
                disabled: true,
              ),
            ],
          ),
        ],
      ),
    ],
  ),
];
