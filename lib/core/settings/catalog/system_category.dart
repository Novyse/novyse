import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';
import 'package:novyse/core/utils/platform.dart';

/// System settings.
final List<SettingCategory> systemCategory = [
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
];
