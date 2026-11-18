import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import 'app_localizations.dart';

export 'app_localizations.dart';

/// All localization delegates required by MaterialApp.
const localizationsDelegates = [
  AppLocalizations.delegate,
  ...GlobalMaterialLocalizations.delegates,
];

/// Supported locales, derived from the generated ARB files.
const supportedLocales = AppLocalizations.supportedLocales;

/// Resolves the device locale to a supported one.
/// Falls back to English if the system language is not supported.
Locale? resolveLocale(Locale? locale, Iterable<Locale> supported) {
  for (final supportedLocale in supported) {
    if (supportedLocale.languageCode == locale?.languageCode) {
      return supportedLocale;
    }
  }
  return const Locale('en');
}

/// [AppLocalizations] for the current device locale (no [BuildContext] needed).
AppLocalizations lookupAppL10n([Locale? locale]) {
  final resolved =
      resolveLocale(
        locale ?? PlatformDispatcher.instance.locale,
        supportedLocales,
      ) ??
      const Locale('en');
  return lookupAppLocalizations(resolved);
}

/// Shortcut to access the current [AppLocalizations] without nullable boilerplate.
extension L10nX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
