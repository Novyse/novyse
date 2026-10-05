import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/events/global_event_receiver.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/notification_binder.dart';
import 'package:novyse/core/notifications/notification_manager.dart';
import 'package:novyse/core/share/share_intent_binder.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';
import 'package:novyse/ui/components/window/desktop_tray_controller.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';
import 'package:novyse/ui/components/window/desktop_window_frame.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/auth/onboarding_manager.dart';
import 'core/router/router.dart';
import 'core/settings/settings_controller.dart';
import 'core/themes/themes.dart';

Future<void> _initDesktopWindow() async {
  await DesktopWindowController.init();
  await DesktopTrayController.init();
}

Future<void> _initFirebase() async {
  final mobileOrWeb =
      kIsWeb || currentOS == AppOS.android || currentOS == AppOS.ios;
  if (!mobileOrWeb) return;
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('[main] Firebase init skipped: $e');
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting();
  await _initDesktopWindow();
  await _initFirebase();
  if (kIsWeb) {
    unawaited(BrowserContextMenu.disableContextMenu());
  }
  await onboardingManager.checkInitialSession();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsControllerProvider);
    final palette = paletteFromSettings(settings);
    final surface = surfaceFromSetting(settings['appearance.surfaceMode']);
    return MaterialApp.router(
      title: appName,
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: Locale(
        supportedLocales.any(
              (locale) => locale.languageCode == settings['locale.appLanguage'],
            )
            ? settings['locale.appLanguage']! as String
            : 'en',
      ),
      localeResolutionCallback: resolveLocale,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(
        brightness: Brightness.light,
        palette: palette,
        surface: surface,
      ),
      darkTheme: AppTheme.build(
        brightness: Brightness.dark,
        palette: palette,
        surface: surface,
      ),
      themeMode: themeModeFromSetting(settings['appearance.themeMode']),
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) => GlobalEventReceiver(
        child: NotificationBinder(
          child: ShareIntentBinder(
            child: DesktopWindowFrame(child: child ?? const SizedBox.shrink()),
          ),
        ),
      ),
    );
  }
}
