/// The catalog is the single source of truth for settings navigation,
/// standard row rendering, defaults and validation metadata.
///
/// Hierarchy: `Category -> Page -> Group -> Item`.
library;

import 'package:flutter/widgets.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';

extension SettingsL10nX on BuildContext {
  String settingsText(String Function(AppLocalizations) text) =>
      text(AppLocalizations.of(this)!);
}

enum SettingScope { local, synchronized }

enum SettingComponent {
  navigation,
  modal,
  switchToggle,
  select,
  multiSelect,
  slider,
  textInput,
  colorPicker,
  value,
  staticText,
  action,
  custom,
  hotkey,
}

/// A stable selectable value with a localized label ([label]).
class SettingOption {
  final String value;
  final String Function(AppLocalizations) label;
  const SettingOption(this.value, this.label);
}

/// A single row/element inside a group.
///
/// - [settingKey]: persisted preference key (absent for actions,
///   read-only info and navigation elements).
/// - [scope]: required when [settingKey] is present.
/// - [actionId]: handler id resolved by the Flutter action registry.
/// - [customRendererId]: renderer id for complex domain UI.
/// - [valueProviderId]: provider id for read-only values (e.g. app version).
/// - [disabled]: when true the row renders non-interactive (WIP placeholder).
///   Defaults to false.
/// - [supportedOS]: OS list where the item is visible. Defaults to all
///   [AppOS.values]; e.g. tray/startup items use only desktop OS.
class SettingItem {
  final String id;
  final SettingComponent component;
  final String? settingKey;
  final SettingScope? scope;
  final Object? defaultValue;
  final List<SettingOption>? options;
  final double? min;
  final double? max;
  final String? actionId;
  final String? customRendererId;
  final String? valueProviderId;
  final String? targetPageId;
  final List<List<dynamic>>? icon;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final bool danger;
  final bool disabled;
  final List<AppOS> supportedOS;

  const SettingItem({
    required this.id,
    required this.component,
    required this.title,
    required this.subtitle,
    this.settingKey,
    this.scope,
    this.defaultValue,
    this.options,
    this.min,
    this.max,
    this.actionId,
    this.customRendererId,
    this.valueProviderId,
    this.targetPageId,
    this.icon,
    this.danger = false,
    this.disabled = false,
    this.supportedOS = AppOS.values,
  });

  /// Whether this item should be shown on the current OS.
  bool get isSupportedOnCurrentOS => supportedOS.contains(currentOS);

  /// Whether the row must render as non-interactive.
  bool get isEffectivelyDisabled => disabled || !isSupportedOnCurrentOS;
}

class SettingGroup {
  final String id;
  final String Function(AppLocalizations) title;
  final List<SettingItem> items;
  const SettingGroup({
    required this.id,
    required this.title,
    required this.items,
  });
}

class SettingPage {
  final String id;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final List<SettingGroup> groups;
  const SettingPage({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.groups,
  });
}

class SettingCategory {
  final String id;
  final List<List<dynamic>> icon;
  final String Function(AppLocalizations) title;
  final String Function(AppLocalizations) subtitle;
  final List<SettingPage> pages;
  final List<SettingItem> items;

  const SettingCategory({
    required this.id,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.pages = const [],
    this.items = const [],
  });
}

class SettingsCatalog {
  SettingsCatalog._();

  static final List<SettingCategory> categories = [
    // 1. Account
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
          id: 'active_sessions',
          title: (l) => l.settingsItemActiveSessionsTitle,
          subtitle: (l) => l.settingsItemActiveSessionsSubtitle,
          component: SettingComponent.custom,
          scope: SettingScope.synchronized,
          customRendererId: 'sessionAuditor',
          disabled: true,
        ),
        SettingItem(
          id: 'logout',
          title: (l) => l.settingsItemLogoutTitle,
          subtitle: (l) => l.settingsItemLogoutSubtitle,
          component: SettingComponent.action,
          scope: SettingScope.local,
          actionId: 'logout',
          disabled: true,
        ),
        SettingItem(
          id: 'delete_profile',
          title: (l) => l.settingsItemDeleteProfileTitle,
          subtitle: (l) => l.settingsItemDeleteProfileSubtitle,
          component: SettingComponent.action,
          scope: SettingScope.synchronized,
          actionId: 'deleteProfile',
          danger: true,
          disabled: true,
        ),
      ],
    ),
    // 2. Chat Settings
    SettingCategory(
      id: 'chat',
      title: (l) => l.settingsCategoryChatTitle,
      subtitle: (l) => l.settingsCategoryChatSubtitle,
      icon: HugeIcons.strokeRoundedChat01,
      pages: [
        SettingPage(
          id: 'chat_media',
          title: (l) => l.settingsPageChatMediaTitle,
          subtitle: (l) => l.settingsPageChatMediaSubtitle,
          groups: [
            SettingGroup(
              id: 'media_sounds',
              title: (l) => l.settingsGroupMediaSoundsTitle,
              items: [
                SettingItem(
                  id: 'pause_music_recording',
                  title: (l) => l.settingsItemPauseMusicRecordingTitle,
                  subtitle: (l) => l.settingsItemPauseMusicRecordingSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.pauseMusicWhileRecording',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'pause_music_playing',
                  title: (l) => l.settingsItemPauseMusicPlayingTitle,
                  subtitle: (l) => l.settingsItemPauseMusicPlayingSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.pauseMusicWhilePlaying',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'autoplay_gifs',
                  title: (l) => l.settingsItemAutoplayGifsTitle,
                  subtitle: (l) => l.settingsItemAutoplayGifsSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.autoplayGifsAndVideos',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'ear_speaker',
                  title: (l) => l.settingsItemEarSpeakerTitle,
                  subtitle: (l) => l.settingsItemEarSpeakerSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.earSpeakerMode',
                  scope: SettingScope.local,
                  defaultValue: false,
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'chat_input',
          title: (l) => l.settingsPageChatInputTitle,
          subtitle: (l) => l.settingsPageChatInputSubtitle,
          groups: [
            SettingGroup(
              id: 'input_formatting',
              title: (l) => l.settingsGroupInputFormattingTitle,
              items: [
                SettingItem(
                  id: 'send_with_enter',
                  title: (l) => l.settingsItemSendWithEnterTitle,
                  subtitle: (l) => l.settingsItemSendWithEnterSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.sendWithEnter',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'markdown_toolbar',
                  title: (l) => l.settingsItemMarkdownToolbarTitle,
                  subtitle: (l) => l.settingsItemMarkdownToolbarSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.markdownToolbar',
                  scope: SettingScope.synchronized,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'smart_emoji',
                  title: (l) => l.settingsItemSmartEmojiTitle,
                  subtitle: (l) => l.settingsItemSmartEmojiSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'chat.smartEmojiSuggestions',
                  scope: SettingScope.synchronized,
                  defaultValue: true,
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    // 3. Customization
    SettingCategory(
      id: 'customization',
      title: (l) => l.settingsCategoryCustomizationTitle,
      subtitle: (l) => l.settingsCategoryCustomizationSubtitle,
      icon: HugeIcons.strokeRoundedAlbum01,
      pages: [
        SettingPage(
          id: 'customization_themes',
          title: (l) => l.settingsPageCustomizationThemesTitle,
          subtitle: (l) => l.settingsPageCustomizationThemesSubtitle,
          groups: [
            SettingGroup(
              id: 'themes',
              title: (l) => l.settingsGroupThemesTitle,
              items: [
                SettingItem(
                  id: 'theme_selector',
                  title: (l) => l.settingsItemThemeSelectorTitle,
                  subtitle: (l) => l.settingsItemThemeSelectorSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'appearance.theme',
                  scope: SettingScope.synchronized,
                  defaultValue: 'dark_slate',
                  options: [
                    SettingOption(
                      'dark_slate',
                      (l) => l.settingsOptionThemeSelectorDarkSlateLabel,
                    ),
                    SettingOption(
                      'midnight_oled',
                      (l) => l.settingsOptionThemeSelectorMidnightOledLabel,
                    ),
                    SettingOption(
                      'clean_light',
                      (l) => l.settingsOptionThemeSelectorCleanLightLabel,
                    ),
                    SettingOption(
                      'cyberpunk_neon',
                      (l) => l.settingsOptionThemeSelectorCyberpunkNeonLabel,
                    ),
                    SettingOption(
                      'forest',
                      (l) => l.settingsOptionThemeSelectorForestLabel,
                    ),
                    SettingOption(
                      'sunset',
                      (l) => l.settingsOptionThemeSelectorSunsetLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'theme_studio',
                  title: (l) => l.settingsItemThemeStudioTitle,
                  subtitle: (l) => l.settingsItemThemeStudioSubtitle,
                  component: SettingComponent.custom,
                  scope: SettingScope.synchronized,
                  customRendererId: 'themeStudio',
                  disabled: true,
                ),
                SettingItem(
                  id: 'sync_themes',
                  title: (l) => l.settingsItemSyncThemesTitle,
                  subtitle: (l) => l.settingsItemSyncThemesSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'appearance.syncThemes',
                  scope: SettingScope.synchronized,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'holiday_themes',
                  title: (l) => l.settingsItemHolidayThemesTitle,
                  subtitle: (l) => l.settingsItemHolidayThemesSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'appearance.holidayThemes',
                  scope: SettingScope.synchronized,
                  defaultValue: false,
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'customization_visual',
          title: (l) => l.settingsPageCustomizationVisualTitle,
          subtitle: (l) => l.settingsPageCustomizationVisualSubtitle,
          groups: [
            SettingGroup(
              id: 'visual_assets',
              title: (l) => l.settingsGroupVisualAssetsTitle,
              items: [
                SettingItem(
                  id: 'app_icon',
                  title: (l) => l.settingsItemAppIconTitle,
                  subtitle: (l) => l.settingsItemAppIconSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'appearance.appIcon',
                  scope: SettingScope.local,
                  defaultValue: 'classic',
                  options: [
                    SettingOption(
                      'classic',
                      (l) => l.settingsOptionAppIconClassicLabel,
                    ),
                    SettingOption(
                      'minimalist',
                      (l) => l.settingsOptionAppIconMinimalistLabel,
                    ),
                    SettingOption(
                      'dark_mono',
                      (l) => l.settingsOptionAppIconDarkMonoLabel,
                    ),
                    SettingOption(
                      'retro_3d',
                      (l) => l.settingsOptionAppIconRetro3dLabel,
                    ),
                    SettingOption(
                      'gradient',
                      (l) => l.settingsOptionAppIconGradientLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'wallpaper',
                  title: (l) => l.settingsItemWallpaperTitle,
                  subtitle: (l) => l.settingsItemWallpaperSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'appearance.wallpaper',
                  scope: SettingScope.synchronized,
                  defaultValue: 'solid_default',
                  customRendererId: 'wallpaperEditor',
                  disabled: true,
                ),
                SettingItem(
                  id: 'density_font',
                  title: (l) => l.settingsItemDensityFontTitle,
                  subtitle: (l) => l.settingsItemDensityFontSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'appearance.densityAndFontScale',
                  scope: SettingScope.local,
                  defaultValue: 'standard_100',
                  customRendererId: 'densityFont',
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    // 4. Storage
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
            SettingOption(
              'files',
              (l) => l.settingsOptionWifiDownloadFilesLabel,
            ),
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
    // 5. Security & Privacy
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
                  disabled: true,
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
                  disabled: true,
                ),
                SettingItem(
                  id: 'api_keys',
                  title: (l) => l.settingsItemApiKeysTitle,
                  subtitle: (l) => l.settingsItemApiKeysSubtitle,
                  component: SettingComponent.custom,
                  scope: SettingScope.synchronized,
                  customRendererId: 'apiKeys',
                  disabled: true,
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
                      (l) =>
                          l.settingsOptionProfilePhotoVisibilityEveryoneLabel,
                    ),
                    SettingOption(
                      'contacts',
                      (l) =>
                          l.settingsOptionProfilePhotoVisibilityContactsLabel,
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
              ],
            ),
          ],
        ),
      ],
    ),
    // 6. Notifications
    SettingCategory(
      id: 'notifications',
      title: (l) => l.settingsCategoryNotificationsTitle,
      subtitle: (l) => l.settingsCategoryNotificationsSubtitle,
      icon: HugeIcons.strokeRoundedNotification01,
      pages: [
        SettingPage(
          id: 'notifications_chats',
          title: (l) => l.settingsPageNotificationsChatsTitle,
          subtitle: (l) => l.settingsPageNotificationsChatsSubtitle,
          groups: [
            SettingGroup(
              id: 'chat_notifications',
              title: (l) => l.settingsGroupChatNotificationsTitle,
              items: [
                SettingItem(
                  id: 'private_chats',
                  title: (l) => l.settingsItemPrivateChatsTitle,
                  subtitle: (l) => l.settingsItemPrivateChatsSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.privateChats',
                  scope: SettingScope.synchronized,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'groups_mode',
                  title: (l) => l.settingsItemGroupsModeTitle,
                  subtitle: (l) => l.settingsItemGroupsModeSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'notifications.groups',
                  scope: SettingScope.synchronized,
                  defaultValue: 'mentions',
                  options: [
                    SettingOption(
                      'all',
                      (l) => l.settingsOptionGroupsModeAllLabel,
                    ),
                    SettingOption(
                      'mentions',
                      (l) => l.settingsOptionGroupsModeMentionsLabel,
                    ),
                    SettingOption(
                      'muted',
                      (l) => l.settingsOptionGroupsModeMutedLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'channels_notif',
                  title: (l) => l.settingsItemChannelsNotifTitle,
                  subtitle: (l) => l.settingsItemChannelsNotifSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.channels',
                  scope: SettingScope.synchronized,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'forums_notif',
                  title: (l) => l.settingsItemForumsNotifTitle,
                  subtitle: (l) => l.settingsItemForumsNotifSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'notifications.forums',
                  scope: SettingScope.synchronized,
                  defaultValue: 'subscribed',
                  options: [
                    SettingOption(
                      'all',
                      (l) => l.settingsOptionForumsNotifAllLabel,
                    ),
                    SettingOption(
                      'subscribed',
                      (l) => l.settingsOptionForumsNotifSubscribedLabel,
                    ),
                    SettingOption(
                      'muted',
                      (l) => l.settingsOptionForumsNotifMutedLabel,
                    ),
                  ],
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'notifications_calls',
          title: (l) => l.settingsPageNotificationsCallsTitle,
          subtitle: (l) => l.settingsPageNotificationsCallsSubtitle,
          groups: [
            SettingGroup(
              id: 'calls',
              title: (l) => l.settingsGroupCallsTitle,
              items: [
                SettingItem(
                  id: 'ringtone',
                  title: (l) => l.settingsItemRingtoneTitle,
                  subtitle: (l) => l.settingsItemRingtoneSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'notifications.ringtone',
                  scope: SettingScope.local,
                  defaultValue: 'default',
                  customRendererId: 'ringtonePicker',
                  disabled: true,
                ),
                SettingItem(
                  id: 'vibration',
                  title: (l) => l.settingsItemVibrationTitle,
                  subtitle: (l) => l.settingsItemVibrationSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'notifications.callVibration',
                  scope: SettingScope.local,
                  defaultValue: 'heartbeat',
                  options: [
                    SettingOption(
                      'continuous',
                      (l) => l.settingsOptionVibrationContinuousLabel,
                    ),
                    SettingOption(
                      'heartbeat',
                      (l) => l.settingsOptionVibrationHeartbeatLabel,
                    ),
                    SettingOption(
                      'pulse',
                      (l) => l.settingsOptionVibrationPulseLabel,
                    ),
                    SettingOption(
                      'silent',
                      (l) => l.settingsOptionVibrationSilentLabel,
                    ),
                  ],
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'notifications_inapp',
          title: (l) => l.settingsPageNotificationsInappTitle,
          subtitle: (l) => l.settingsPageNotificationsInappSubtitle,
          groups: [
            SettingGroup(
              id: 'inapp',
              title: (l) => l.settingsGroupInappTitle,
              items: [
                SettingItem(
                  id: 'inapp_sounds',
                  title: (l) => l.settingsItemInappSoundsTitle,
                  subtitle: (l) => l.settingsItemInappSoundsSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.inAppSounds',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'inapp_vibrate',
                  title: (l) => l.settingsItemInappVibrateTitle,
                  subtitle: (l) => l.settingsItemInappVibrateSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.inAppVibrate',
                  scope: SettingScope.local,
                  defaultValue: false,
                  disabled: true,
                ),
                SettingItem(
                  id: 'inapp_preview',
                  title: (l) => l.settingsItemInappPreviewTitle,
                  subtitle: (l) => l.settingsItemInappPreviewSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.inAppPreview',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'inapp_effects',
                  title: (l) => l.settingsItemInappEffectsTitle,
                  subtitle: (l) => l.settingsItemInappEffectsSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'notifications.inChatEffects',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'badge_rules',
                  title: (l) => l.settingsItemBadgeRulesTitle,
                  subtitle: (l) => l.settingsItemBadgeRulesSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'notifications.badgeRules',
                  scope: SettingScope.local,
                  defaultValue: 'unread_messages',
                  options: [
                    SettingOption(
                      'unread_messages',
                      (l) => l.settingsOptionBadgeRulesUnreadMessagesLabel,
                    ),
                    SettingOption(
                      'unread_chats',
                      (l) => l.settingsOptionBadgeRulesUnreadChatsLabel,
                    ),
                    SettingOption(
                      'exclude_muted',
                      (l) => l.settingsOptionBadgeRulesExcludeMutedLabel,
                    ),
                  ],
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    // 7. Comms
    SettingCategory(
      id: 'comms',
      title: (l) => l.settingsCategoryCommsTitle,
      subtitle: (l) => l.settingsCategoryCommsSubtitle,
      icon: HugeIcons.strokeRoundedMic01,
      pages: [
        SettingPage(
          id: 'comms_voice',
          title: (l) => l.settingsPageCommsVoiceTitle,
          subtitle: (l) => l.settingsPageCommsVoiceSubtitle,
          groups: [
            SettingGroup(
              id: 'voice',
              title: (l) => l.settingsGroupVoiceTitle,
              items: [
                SettingItem(
                  id: 'input_device',
                  title: (l) => l.settingsItemInputDeviceTitle,
                  subtitle: (l) => l.settingsItemInputDeviceSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'comms.inputDevice',
                  scope: SettingScope.local,
                  defaultValue: 'default',
                  customRendererId: 'audioDevicePicker',
                  disabled: true,
                ),
                SettingItem(
                  id: 'output_device',
                  title: (l) => l.settingsItemOutputDeviceTitle,
                  subtitle: (l) => l.settingsItemOutputDeviceSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'comms.outputDevice',
                  scope: SettingScope.local,
                  defaultValue: 'default',
                  customRendererId: 'audioDevicePicker',
                  disabled: true,
                ),
                SettingItem(
                  id: 'mic_test',
                  title: (l) => l.settingsItemMicTestTitle,
                  subtitle: (l) => l.settingsItemMicTestSubtitle,
                  component: SettingComponent.action,
                  scope: SettingScope.local,
                  actionId: 'micTest',
                  disabled: true,
                ),
                SettingItem(
                  id: 'input_mode',
                  title: (l) => l.settingsItemInputModeTitle,
                  subtitle: (l) => l.settingsItemInputModeSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'comms.inputMode',
                  scope: SettingScope.local,
                  defaultValue: 'vad',
                  options: [
                    SettingOption(
                      'vad',
                      (l) => l.settingsOptionInputModeVadLabel,
                    ),
                    SettingOption(
                      'ptt',
                      (l) => l.settingsOptionInputModePttLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'noise_suppression',
                  title: (l) => l.settingsItemNoiseSuppressionTitle,
                  subtitle: (l) => l.settingsItemNoiseSuppressionSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'comms.noiseSuppression',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'expander',
                  title: (l) => l.settingsItemExpanderTitle,
                  subtitle: (l) => l.settingsItemExpanderSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'comms.expander',
                  scope: SettingScope.local,
                  defaultValue: false,
                  disabled: true,
                ),
                SettingItem(
                  id: 'noise_gate',
                  title: (l) => l.settingsItemNoiseGateTitle,
                  subtitle: (l) => l.settingsItemNoiseGateSubtitle,
                  component: SettingComponent.slider,
                  settingKey: 'comms.noiseGateDb',
                  scope: SettingScope.local,
                  defaultValue: -42,
                  min: -60,
                  max: 0,
                  disabled: true,
                ),
                SettingItem(
                  id: 'keystroke_attenuation',
                  title: (l) => l.settingsItemKeystrokeAttenuationTitle,
                  subtitle: (l) => l.settingsItemKeystrokeAttenuationSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'comms.keystrokeAttenuation',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
                SettingItem(
                  id: 'echo_cancellation',
                  title: (l) => l.settingsItemEchoCancellationTitle,
                  subtitle: (l) => l.settingsItemEchoCancellationSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'comms.echoCancellation',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'comms_video',
          title: (l) => l.settingsPageCommsVideoTitle,
          subtitle: (l) => l.settingsPageCommsVideoSubtitle,
          groups: [
            SettingGroup(
              id: 'video',
              title: (l) => l.settingsGroupVideoTitle,
              items: [
                SettingItem(
                  id: 'webcam',
                  title: (l) => l.settingsItemWebcamTitle,
                  subtitle: (l) => l.settingsItemWebcamSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'comms.webcam',
                  scope: SettingScope.local,
                  defaultValue: 'default',
                  customRendererId: 'cameraPicker',
                  disabled: true,
                ),
                SettingItem(
                  id: 'video_quality',
                  title: (l) => l.settingsItemVideoQualityTitle,
                  subtitle: (l) => l.settingsItemVideoQualitySubtitle,
                  component: SettingComponent.select,
                  settingKey: 'comms.videoQuality',
                  scope: SettingScope.local,
                  defaultValue: '1080p',
                  options: [
                    SettingOption(
                      '720p',
                      (l) => l.settingsOptionVideoQuality720pLabel,
                    ),
                    SettingOption(
                      '1080p',
                      (l) => l.settingsOptionVideoQuality1080pLabel,
                    ),
                    SettingOption(
                      '4k',
                      (l) => l.settingsOptionVideoQuality4kLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'video_fps',
                  title: (l) => l.settingsItemVideoFpsTitle,
                  subtitle: (l) => l.settingsItemVideoFpsSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'comms.videoFramerate',
                  scope: SettingScope.local,
                  defaultValue: '30',
                  options: [
                    SettingOption('30', (l) => l.settingsOptionVideoFps30Label),
                    SettingOption('60', (l) => l.settingsOptionVideoFps60Label),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'virtual_bg',
                  title: (l) => l.settingsItemVirtualBgTitle,
                  subtitle: (l) => l.settingsItemVirtualBgSubtitle,
                  component: SettingComponent.select,
                  settingKey: 'comms.virtualBackground',
                  scope: SettingScope.local,
                  defaultValue: 'none',
                  options: [
                    SettingOption(
                      'none',
                      (l) => l.settingsOptionVirtualBgNoneLabel,
                    ),
                    SettingOption(
                      'light_blur',
                      (l) => l.settingsOptionVirtualBgLightBlurLabel,
                    ),
                    SettingOption(
                      'heavy_blur',
                      (l) => l.settingsOptionVirtualBgHeavyBlurLabel,
                    ),
                    SettingOption(
                      'custom',
                      (l) => l.settingsOptionVirtualBgCustomLabel,
                    ),
                  ],
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'comms_screenshare',
          title: (l) => l.settingsPageCommsScreenshareTitle,
          subtitle: (l) => l.settingsPageCommsScreenshareSubtitle,
          groups: [
            SettingGroup(
              id: 'screenshare',
              title: (l) => l.settingsGroupScreenshareTitle,
              items: [
                SettingItem(
                  id: 'share_quality',
                  title: (l) => l.settingsItemShareQualityTitle,
                  subtitle: (l) => l.settingsItemShareQualitySubtitle,
                  component: SettingComponent.select,
                  settingKey: 'comms.shareQuality',
                  scope: SettingScope.local,
                  defaultValue: 'clarity',
                  options: [
                    SettingOption(
                      'fluid_60',
                      (l) => l.settingsOptionShareQualityFluid60Label,
                    ),
                    SettingOption(
                      'clarity',
                      (l) => l.settingsOptionShareQualityClarityLabel,
                    ),
                  ],
                  disabled: true,
                ),
                SettingItem(
                  id: 'hifi_audio',
                  title: (l) => l.settingsItemHifiAudioTitle,
                  subtitle: (l) => l.settingsItemHifiAudioSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'comms.hifiAudioPassthrough',
                  scope: SettingScope.local,
                  defaultValue: false,
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'comms_sounds',
          title: (l) => l.settingsPageCommsSoundsTitle,
          subtitle: (l) => l.settingsPageCommsSoundsSubtitle,
          groups: [
            SettingGroup(
              id: 'comms_sound_items',
              title: (l) => l.settingsGroupCommsSoundItemsTitle,
              items: [
                SettingItem(
                  id: 'soundboard',
                  title: (l) => l.settingsItemSoundboardTitle,
                  subtitle: (l) => l.settingsItemSoundboardSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'comms.soundboard',
                  scope: SettingScope.local,
                  defaultValue: '{}',
                  customRendererId: 'soundboard',
                  disabled: true,
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    // 8. System
    SettingCategory(
      id: 'system',
      title: (l) => l.settingsCategorySystemTitle,
      subtitle: (l) => l.settingsCategorySystemSubtitle,
      icon: HugeIcons.strokeRoundedSettings01,
      pages: [
        SettingPage(
          id: 'system_general',
          title: (l) => l.settingsPageSystemGeneralTitle,
          subtitle: (l) => l.settingsPageSystemGeneralSubtitle,
          groups: [
            SettingGroup(
              id: 'general',
              title: (l) => l.settingsGroupGeneralTitle,
              items: [
                SettingItem(
                  id: 'open_startup',
                  title: (l) => l.settingsItemOpenStartupTitle,
                  subtitle: (l) => l.settingsItemOpenStartupSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'system.openOnStartup',
                  scope: SettingScope.local,
                  defaultValue: false,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
                SettingItem(
                  id: 'open_background',
                  title: (l) => l.settingsItemOpenBackgroundTitle,
                  subtitle: (l) => l.settingsItemOpenBackgroundSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'system.openInBackground',
                  scope: SettingScope.local,
                  defaultValue: false,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
                SettingItem(
                  id: 'close_to_tray',
                  title: (l) => l.settingsItemCloseToTrayTitle,
                  subtitle: (l) => l.settingsItemCloseToTraySubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'system.closeToTray',
                  scope: SettingScope.local,
                  defaultValue: true,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
                SettingItem(
                  id: 'gpu_accel',
                  title: (l) => l.settingsItemGpuAccelTitle,
                  subtitle: (l) => l.settingsItemGpuAccelSubtitle,
                  component: SettingComponent.switchToggle,
                  settingKey: 'system.gpuAcceleration',
                  scope: SettingScope.local,
                  defaultValue: true,
                  disabled: true,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
              ],
            ),
          ],
        ),
        SettingPage(
          id: 'system_shortcuts',
          title: (l) => l.settingsPageSystemShortcutsTitle,
          subtitle: (l) => l.settingsPageSystemShortcutsSubtitle,
          groups: [
            SettingGroup(
              id: 'shortcuts',
              title: (l) => l.settingsGroupShortcutsTitle,
              items: [
                SettingItem(
                  id: 'shortcut_manager',
                  title: (l) => l.settingsItemShortcutManagerTitle,
                  subtitle: (l) => l.settingsItemShortcutManagerSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'system.shortcuts',
                  scope: SettingScope.synchronized,
                  defaultValue: '{}',
                  customRendererId: 'shortcutManager',
                  disabled: true,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
                SettingItem(
                  id: 'global_hotkeys',
                  title: (l) => l.settingsItemGlobalHotkeysTitle,
                  subtitle: (l) => l.settingsItemGlobalHotkeysSubtitle,
                  component: SettingComponent.custom,
                  settingKey: 'system.globalHotkeys',
                  scope: SettingScope.local,
                  defaultValue: '{}',
                  customRendererId: 'globalHotkeys',
                  disabled: true,
                  supportedOS: const [AppOS.linux, AppOS.windows, AppOS.macos],
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    // 9. Languages & Time (flat entries, as in the wiki)
    SettingCategory(
      id: 'language',
      title: (l) => l.settingsCategoryLanguageTitle,
      subtitle: (l) => l.settingsCategoryLanguageSubtitle,
      icon: HugeIcons.strokeRoundedGlobe,
      items: [
        SettingItem(
          id: 'app_language',
          title: (l) => l.settingsItemAppLanguageTitle,
          subtitle: (l) => l.settingsItemAppLanguageSubtitle,
          component: SettingComponent.select,
          settingKey: 'locale.appLanguage',
          scope: SettingScope.synchronized,
          defaultValue: 'en',
          options: [
            SettingOption('en', (l) => l.settingsOptionAppLanguageEnLabel),
            SettingOption('it', (l) => l.settingsOptionAppLanguageItLabel),
            SettingOption('es', (l) => l.settingsOptionAppLanguageEsLabel),
            SettingOption('fr', (l) => l.settingsOptionAppLanguageFrLabel),
            SettingOption('de', (l) => l.settingsOptionAppLanguageDeLabel),
            SettingOption('ja', (l) => l.settingsOptionAppLanguageJaLabel),
            SettingOption('zh', (l) => l.settingsOptionAppLanguageZhLabel),
          ],
          disabled: true,
        ),
        SettingItem(
          id: 'hour_format',
          title: (l) => l.settingsItemHourFormatTitle,
          subtitle: (l) => l.settingsItemHourFormatSubtitle,
          component: SettingComponent.select,
          settingKey: 'locale.hourFormat',
          scope: SettingScope.synchronized,
          defaultValue: '24h',
          options: [
            SettingOption('24h', (l) => l.settingsOptionHourFormat24hLabel),
            SettingOption('12h', (l) => l.settingsOptionHourFormat12hLabel),
          ],
          disabled: true,
        ),
        SettingItem(
          id: 'first_day',
          title: (l) => l.settingsItemFirstDayTitle,
          subtitle: (l) => l.settingsItemFirstDaySubtitle,
          component: SettingComponent.select,
          settingKey: 'locale.firstDayOfWeek',
          scope: SettingScope.synchronized,
          defaultValue: 'monday',
          options: [
            SettingOption('monday', (l) => l.settingsOptionFirstDayMondayLabel),
            SettingOption('sunday', (l) => l.settingsOptionFirstDaySundayLabel),
          ],
          disabled: true,
        ),
        SettingItem(
          id: 'spellcheck',
          title: (l) => l.settingsItemSpellcheckTitle,
          subtitle: (l) => l.settingsItemSpellcheckSubtitle,
          component: SettingComponent.switchToggle,
          settingKey: 'locale.spellcheck',
          scope: SettingScope.local,
          defaultValue: true,
          disabled: true,
        ),
      ],
    ),
    // 10. Info & Diagnostics (flat entries, as in the wiki)
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
            SettingOption(
              'beta',
              (l) => l.settingsOptionReleaseChannelBetaLabel,
            ),
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

  /// All leaf items across the catalog (page groups + loose category items).
  static List<SettingItem> get allItems => [
    for (final c in categories) ...[
      for (final p in c.pages)
        for (final g in p.groups)
          for (final i in g.items) i,
      for (final i in c.items) i,
    ],
  ];

  /// Persisted preference keys with synchronized scope.
  static List<String> get synchronizedKeys => [
    for (final i in allItems)
      if (i.settingKey != null && i.scope == SettingScope.synchronized)
        i.settingKey!,
  ];

  /// Default values for persisted preferences.
  static Map<String, Object?> get defaults => {
    for (final i in allItems)
      if (i.settingKey != null) i.settingKey!: i.defaultValue,
  };

  static SettingCategory? findCategory(String id) {
    for (final c in categories) {
      if (c.id == id) return c;
    }
    return null;
  }

  static SettingPage? findPage(String categoryId, String pageId) {
    final category = findCategory(categoryId);
    if (category == null) return null;
    for (final p in category.pages) {
      if (p.id == pageId) return p;
    }
    return null;
  }

  static SettingItem? findBySettingKey(String settingKey) {
    for (final i in allItems) {
      if (i.settingKey == settingKey) return i;
    }
    return null;
  }
}
