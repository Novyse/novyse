import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Storage settings.
final List<SettingCategory> storageCategory = [
  SettingCategory(
    id: 'storage',
    title: (l) => l.settingsCategoryStorageTitle,
    subtitle: (l) => l.settingsCategoryStorageSubtitle,
    icon: HugeIcons.strokeRoundedDatabase01,
    pages: [
      SettingPage(
        id: 'storage_local',
        title: (l) => l.settingsPageStorageLocalTitle,
        subtitle: (l) => l.settingsPageStorageLocalSubtitle,
        groups: [
          SettingGroup(
            id: 'local_storage',
            title: (l) => l.settingsGroupLocalStorageTitle,
            items: [
              SettingItem(
                id: 'usage_graph',
                title: (l) => l.settingsItemUsageGraphTitle,
                subtitle: (l) => l.settingsItemUsageGraphSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.local,
                customRendererId: 'storageUsage',
                disabled: true,
              ),
              SettingItem(
                id: 'clear_cache',
                title: (l) => l.settingsItemClearCacheTitle,
                subtitle: (l) => l.settingsItemClearCacheSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'clearCache',
                disabled: true,
              ),
              SettingItem(
                id: 'auto_remove',
                title: (l) => l.settingsItemAutoRemoveTitle,
                subtitle: (l) => l.settingsItemAutoRemoveSubtitle,
                component: SettingComponent.select,
                settingKey: 'storage.autoRemoveCachedMedia',
                scope: SettingScope.local,
                defaultValue: 'one_month',
                options: [
                  SettingOption(
                    'three_days',
                    (l) => l.settingsOptionAutoRemoveThreeDaysLabel,
                  ),
                  SettingOption(
                    'one_week',
                    (l) => l.settingsOptionAutoRemoveOneWeekLabel,
                  ),
                  SettingOption(
                    'one_month',
                    (l) => l.settingsOptionAutoRemoveOneMonthLabel,
                  ),
                  SettingOption(
                    'forever',
                    (l) => l.settingsOptionAutoRemoveForeverLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'max_cache',
                title: (l) => l.settingsItemMaxCacheTitle,
                subtitle: (l) => l.settingsItemMaxCacheSubtitle,
                component: SettingComponent.select,
                settingKey: 'storage.maxCacheSize',
                scope: SettingScope.local,
                defaultValue: 'unlimited',
                options: [
                  SettingOption(
                    'gb_1',
                    (l) => l.settingsOptionMaxCacheGb1Label,
                  ),
                  SettingOption(
                    'gb_5',
                    (l) => l.settingsOptionMaxCacheGb5Label,
                  ),
                  SettingOption(
                    'gb_16',
                    (l) => l.settingsOptionMaxCacheGb16Label,
                  ),
                  SettingOption(
                    'gb_32',
                    (l) => l.settingsOptionMaxCacheGb32Label,
                  ),
                  SettingOption(
                    'unlimited',
                    (l) => l.settingsOptionMaxCacheUnlimitedLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'media_explorer',
                title: (l) => l.settingsItemMediaExplorerTitle,
                subtitle: (l) => l.settingsItemMediaExplorerSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.local,
                customRendererId: 'mediaExplorer',
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'storage_cloud',
        title: (l) => l.settingsPageStorageCloudTitle,
        subtitle: (l) => l.settingsPageStorageCloudSubtitle,
        groups: [
          SettingGroup(
            id: 'cloud_storage',
            title: (l) => l.settingsGroupCloudStorageTitle,
            items: [
              SettingItem(
                id: 'quota_graph',
                title: (l) => l.settingsItemQuotaGraphTitle,
                subtitle: (l) => l.settingsItemQuotaGraphSubtitle,
                component: SettingComponent.custom,
                scope: SettingScope.synchronized,
                customRendererId: 'cloudQuota',
                disabled: true,
              ),
              SettingItem(
                id: 'purge_cloud',
                title: (l) => l.settingsItemPurgeCloudTitle,
                subtitle: (l) => l.settingsItemPurgeCloudSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.synchronized,
                actionId: 'purgeCloudMedia',
                danger: true,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
    ],
    items: [
      SettingItem(
        id: 'wifi_download',
        title: (l) => l.settingsItemWifiDownloadTitle,
        subtitle: (l) => l.settingsItemWifiDownloadSubtitle,
        component: SettingComponent.multiSelect,
        settingKey: 'storage.autoDownloadWifi',
        scope: SettingScope.local,
        defaultValue: 'photos',
        options: [
          SettingOption(
            'photos',
            (l) => l.settingsOptionWifiDownloadPhotosLabel,
          ),
          SettingOption(
            'videos',
            (l) => l.settingsOptionWifiDownloadVideosLabel,
          ),
          SettingOption('files', (l) => l.settingsOptionWifiDownloadFilesLabel),
        ],
        disabled: true,
      ),
      SettingItem(
        id: 'mobile_download',
        title: (l) => l.settingsItemMobileDownloadTitle,
        subtitle: (l) => l.settingsItemMobileDownloadSubtitle,
        component: SettingComponent.multiSelect,
        settingKey: 'storage.autoDownloadMobile',
        scope: SettingScope.local,
        defaultValue: '',
        options: [
          SettingOption(
            'photos',
            (l) => l.settingsOptionMobileDownloadPhotosLabel,
          ),
          SettingOption(
            'videos',
            (l) => l.settingsOptionMobileDownloadVideosLabel,
          ),
          SettingOption(
            'files',
            (l) => l.settingsOptionMobileDownloadFilesLabel,
          ),
        ],
        disabled: true,
      ),
      SettingItem(
        id: 'roaming_download',
        title: (l) => l.settingsItemRoamingDownloadTitle,
        subtitle: (l) => l.settingsItemRoamingDownloadSubtitle,
        component: SettingComponent.multiSelect,
        settingKey: 'storage.autoDownloadRoaming',
        scope: SettingScope.local,
        defaultValue: '',
        options: [
          SettingOption(
            'photos',
            (l) => l.settingsOptionRoamingDownloadPhotosLabel,
          ),
          SettingOption(
            'videos',
            (l) => l.settingsOptionRoamingDownloadVideosLabel,
          ),
          SettingOption(
            'files',
            (l) => l.settingsOptionRoamingDownloadFilesLabel,
          ),
        ],
        disabled: true,
      ),
      SettingItem(
        id: 'save_gallery',
        title: (l) => l.settingsItemSaveGalleryTitle,
        subtitle: (l) => l.settingsItemSaveGallerySubtitle,
        component: SettingComponent.select,
        settingKey: 'storage.saveToGallery',
        scope: SettingScope.local,
        defaultValue: 'disabled',
        options: [
          SettingOption(
            'disabled',
            (l) => l.settingsOptionSaveGalleryDisabledLabel,
          ),
          SettingOption(
            'private_only',
            (l) => l.settingsOptionSaveGalleryPrivateOnlyLabel,
          ),
          SettingOption(
            'groups_only',
            (l) => l.settingsOptionSaveGalleryGroupsOnlyLabel,
          ),
          SettingOption('all', (l) => l.settingsOptionSaveGalleryAllLabel),
        ],
        disabled: true,
      ),
      SettingItem(
        id: 'reset_db',
        title: (l) => l.settingsItemResetDbTitle,
        subtitle: (l) => l.settingsItemResetDbSubtitle,
        component: SettingComponent.action,
        scope: SettingScope.local,
        actionId: 'resetDatabase',
        danger: true,
        disabled: true,
      ),
    ],
  ),
];
