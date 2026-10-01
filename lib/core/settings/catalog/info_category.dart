import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/settings/settings_models.dart';

/// Info & Diagnostics (flat entries, as in the wiki) settings.
final List<SettingCategory> infoDiagnosticsFlatEntriesCategory = [
  SettingCategory(
    id: 'info',
    title: (l) => l.settingsCategoryInfoTitle,
    subtitle: (l) => l.settingsCategoryInfoSubtitle,
    icon: HugeIcons.strokeRoundedInformationCircle,
    pages: [
      SettingPage(
        id: 'legal',
        title: (l) => l.settingsPageInfoLegalTitle,
        subtitle: (l) => l.settingsPageInfoLegalSubtitle,
        groups: [
          SettingGroup(
            id: 'legal',
            title: (l) => l.settingsGroupLegalTitle,
            items: [
              SettingItem(
                id: 'privacy_policy',
                title: (l) => l.settingsItemPrivacyPolicyTitle,
                subtitle: (l) => l.settingsItemPrivacyPolicySubtitle,
                component: SettingComponent.externalLink,
                scope: SettingScope.local,
                externalUrl: config.privacyPolicyUrl,
              ),
              SettingItem(
                id: 'terms_of_service',
                title: (l) => l.settingsItemTermsTitle,
                subtitle: (l) => l.settingsItemTermsSubtitle,
                component: SettingComponent.externalLink,
                scope: SettingScope.local,
                externalUrl: config.tosUrl,
              ),
              SettingItem(
                id: 'app_license',
                title: (l) => l.settingsItemAppLicenseTitle,
                subtitle: (l) => l.settingsItemAppLicenseSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'openAppLicense',
              ),
              SettingItem(
                id: 'open_source_licenses',
                title: (l) => l.settingsItemOpenSourceTitle,
                subtitle: (l) => l.settingsItemOpenSourceSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'openLicenses',
              ),
            ],
          ),
        ],
      ),
    ],
    items: [
      SettingItem(
        id: 'version',
        title: (l) => l.settingsItemVersionTitle,
        subtitle: (l) => l.settingsItemVersionSubtitle,
        component: SettingComponent.value,
        scope: SettingScope.local,
        valueProviderId: 'appVersion',
        disabled: true,
      ),
      SettingItem(
        id: 'release_channel',
        title: (l) => l.settingsItemReleaseChannelTitle,
        subtitle: (l) => l.settingsItemReleaseChannelSubtitle,
        component: SettingComponent.select,
        settingKey: 'info.releaseChannel',
        scope: SettingScope.local,
        defaultValue: 'stable',
        options: [
          SettingOption(
            'stable',
            (l) => l.settingsOptionReleaseChannelStableLabel,
          ),
          SettingOption('beta', (l) => l.settingsOptionReleaseChannelBetaLabel),
          SettingOption(
            'nightly',
            (l) => l.settingsOptionReleaseChannelNightlyLabel,
          ),
        ],
        disabled: true,
      ),
      SettingItem(
        id: 'check_updates',
        title: (l) => l.settingsItemCheckUpdatesTitle,
        subtitle: (l) => l.settingsItemCheckUpdatesSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'checkUpdates',
        disabled: true,
      ),
      SettingItem(
        id: 'resource_links',
        title: (l) => l.settingsItemResourceLinksTitle,
        subtitle: (l) => l.settingsItemResourceLinksSubtitle,
        component: SettingComponent.custom,
        scope: SettingScope.synchronized,
        customRendererId: 'resourceLinks',
        disabled: true,
      ),
      SettingItem(
        id: 'export_logs',
        title: (l) => l.settingsItemExportLogsTitle,
        subtitle: (l) => l.settingsItemExportLogsSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'exportLogs',
        disabled: true,
      ),
    ],
  ),
];
