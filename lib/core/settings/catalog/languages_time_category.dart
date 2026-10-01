import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Languages & Time (flat entries, as in the wiki) settings.
final List<SettingCategory> languagesTimeFlatEntriesCategory = [
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
];
