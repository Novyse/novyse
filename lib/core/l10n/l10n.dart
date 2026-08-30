import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'app_localizations.dart';

export 'app_localizations.dart';

/// All localization delegates required by MaterialApp.
const localizationsDelegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
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
