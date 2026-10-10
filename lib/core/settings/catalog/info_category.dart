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
    items: [
      SettingItem(
        id: 'version',
        title: (l) => l.settingsItemVersionTitle,
        subtitle: (l) => l.settingsItemVersionSubtitle,
        component: SettingComponent.value,
        scope: SettingScope.local,
        valueProviderId: 'appVersion',
        icon: HugeIcons.strokeRoundedInformationCircle,
      ),
      SettingItem(
        id: 'release_channel',
        title: (l) => l.settingsItemReleaseChannelTitle,
        subtitle: (l) => l.settingsItemReleaseChannelSubtitle,
        component: SettingComponent.value,
        valueProviderId: 'updateChannel',
        icon: HugeIcons.strokeRoundedGlobe,
      ),
      SettingItem(
        id: 'check_updates',
        title: (l) => l.settingsItemCheckUpdatesTitle,
        subtitle: (l) => l.settingsItemCheckUpdatesSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'checkUpdates',
        disabled: true,
        icon: HugeIcons.strokeRoundedRefresh,
      ),
      SettingItem(
        id: 'export_logs',
        title: (l) => l.settingsItemExportLogsTitle,
        subtitle: (l) => l.settingsItemExportLogsSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'exportLogs',
        disabled: true,
        icon: HugeIcons.strokeRoundedDownload01,
      ),
    ],
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
                icon: HugeIcons.strokeRoundedShield01,
              ),
              SettingItem(
                id: 'terms_of_service',
                title: (l) => l.settingsItemTermsTitle,
                subtitle: (l) => l.settingsItemTermsSubtitle,
                component: SettingComponent.externalLink,
                scope: SettingScope.local,
                externalUrl: config.tosUrl,
                icon: HugeIcons.strokeRoundedFile01,
              ),
              SettingItem(
                id: 'app_license',
                title: (l) => l.settingsItemAppLicenseTitle,
                subtitle: (l) => l.settingsItemAppLicenseSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'openAppLicense',
                icon: HugeIcons.strokeRoundedLicense,
              ),
              SettingItem(
                id: 'open_source_licenses',
                title: (l) => l.settingsItemOpenSourceTitle,
                subtitle: (l) => l.settingsItemOpenSourceSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'openLicenses',
                icon: HugeIcons.strokeRoundedBookOpen01,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'resources',
        title: (l) => l.settingsItemResourceLinksTitle,
        subtitle: (l) => l.settingsItemResourceLinksSubtitle,
        groups: [
          SettingGroup(
            id: 'resources',
            title: (l) => l.settingsGroupResourcesTitle,
            items: [
              SettingItem(
                id: 'roadmap',
                title: (l) => l.settingsResourceRoadmap,
                subtitle: (l) => l.settingsResourceRoadmapSubtitle,
                component: SettingComponent.externalLink,
                externalUrl: '${config.landingPageUrl}/roadmap',
                icon: HugeIcons.strokeRoundedRoad,
              ),
              SettingItem(
                id: 'patchnotes',
                title: (l) => l.settingsResourcePatchnotes,
                subtitle: (l) => l.settingsResourcePatchnotesSubtitle,
                component: SettingComponent.externalLink,
                externalUrl: '${config.landingPageUrl}/patchnotes',
                icon: HugeIcons.strokeRoundedDocumentCode,
              ),
              SettingItem(
                id: 'news',
                title: (l) => l.settingsResourceNews,
                subtitle: (l) => l.settingsResourceNewsSubtitle,
                component: SettingComponent.externalLink,
                externalUrl: '${config.landingPageUrl}/news',
                icon: HugeIcons.strokeRoundedNews,
              ),
              SettingItem(
                id: 'status',
                title: (l) => l.settingsResourceStatus,
                subtitle: (l) => l.settingsResourceStatusSubtitle,
                component: SettingComponent.externalLink,
                externalUrl: config.statusPageUrl,
                icon: HugeIcons.strokeRoundedActivity01,
              ),
            ],
          ),
        ],
      ),
    ],
  ),
];
