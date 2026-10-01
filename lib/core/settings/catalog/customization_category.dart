import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Customization settings.
final List<SettingCategory> customizationCategory = [
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
                settingKey: 'appearance.palette',
                scope: SettingScope.synchronized,
                defaultValue: 'novyse',
                options: [
                  SettingOption(
                    'novyse',
                    (l) => l.settingsOptionPaletteNovyseLabel,
                  ),
                  SettingOption(
                    'forest',
                    (l) => l.settingsOptionPaletteForestLabel,
                  ),
                  SettingOption(
                    'sunset',
                    (l) => l.settingsOptionPaletteSunsetLabel,
                  ),
                  SettingOption(
                    'iris',
                    (l) => l.settingsOptionPaletteIrisLabel,
                  ),
                ],
              ),
              SettingItem(
                id: 'theme_mode',
                title: (l) => l.settingsItemThemeModeTitle,
                subtitle: (l) => l.settingsItemThemeModeSubtitle,
                component: SettingComponent.select,
                settingKey: 'appearance.themeMode',
                scope: SettingScope.synchronized,
                defaultValue: 'system',
                options: [
                  SettingOption(
                    'system',
                    (l) => l.settingsOptionThemeModeSystemLabel,
                  ),
                  SettingOption(
                    'light',
                    (l) => l.settingsOptionThemeModeLightLabel,
                  ),
                  SettingOption(
                    'dark',
                    (l) => l.settingsOptionThemeModeDarkLabel,
                  ),
                ],
              ),
              SettingItem(
                id: 'surface_mode',
                title: (l) => l.settingsItemSurfaceModeTitle,
                subtitle: (l) => l.settingsItemSurfaceModeSubtitle,
                component: SettingComponent.select,
                settingKey: 'appearance.surfaceMode',
                scope: SettingScope.synchronized,
                defaultValue: 'standard',
                options: [
                  SettingOption(
                    'standard',
                    (l) => l.settingsOptionSurfaceStandardLabel,
                  ),
                  SettingOption(
                    'amoled',
                    (l) => l.settingsOptionSurfaceAmoledLabel,
                  ),
                  SettingOption(
                    'amoled_extreme',
                    (l) => l.settingsOptionSurfaceAmoledExtremeLabel,
                  ),
                ],
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
];
