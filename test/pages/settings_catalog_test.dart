import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/pages/app/settings/settings_page.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: child,
    ),
  );
}

void main() {
  testWidgets('Account category lists pages and loose actions in wiki order',
      (tester) async {
    await tester.pumpWidget(_wrap(const SettingsCategoryPage(
      categoryId: 'account',
    )));
    await tester.pumpAndSettle();

    final editProfile = find.text('Edit Profile');
    final sessions = find.text('Active Sessions');
    final logout = find.text('Log Out');
    final delete = find.text('Delete Profile');
    expect(editProfile, findsOneWidget);
    expect(sessions, findsOneWidget);
    expect(logout, findsOneWidget);
    expect(delete, findsOneWidget);

    // Wiki order: profile page, sessions, logout, delete.
    expect(
      tester.getTopLeft(editProfile).dy < tester.getTopLeft(sessions).dy,
      isTrue,
    );
    expect(
      tester.getTopLeft(sessions).dy < tester.getTopLeft(logout).dy,
      isTrue,
    );
    expect(
      tester.getTopLeft(logout).dy < tester.getTopLeft(delete).dy,
      isTrue,
    );
  });

  testWidgets('Logout action is WIP-disabled: tap opens no sheet',
      (tester) async {
    await tester.pumpWidget(_wrap(const SettingsCategoryPage(
      categoryId: 'account',
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Log Out'));
    await tester.pumpAndSettle();

    // Disabled placeholder: no confirm sheet must appear.
    expect(find.text('Confirm'), findsNothing);
  });

  testWidgets('Enabled action item still opens a confirmation sheet',
      (tester) async {
    final item = SettingItem(
      id: 'test_logout_enabled',
      component: SettingComponent.action,
      title: (l) => 'Log Out',
      subtitle: (l) => '',
      scope: SettingScope.local,
      actionId: 'logout',
      // disabled defaults to false -> interactive.
    );
    await tester.pumpWidget(_wrap(SettingsItemRenderer(item: item)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Log Out'));
    await tester.pumpAndSettle();

    // Confirm sheet with cancel/confirm buttons.
    expect(find.text('Cancel').hitTestable(), findsOneWidget);
    expect(find.text('Confirm').hitTestable(), findsOneWidget);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm'), findsNothing);
  });

  testWidgets('Theme select is WIP-disabled: tap opens no picker',
      (tester) async {
    await tester.pumpWidget(_wrap(const SettingsGroupPage(
      categoryId: 'customization',
      pageId: 'customization_themes',
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Theme'));
    await tester.pumpAndSettle();

    expect(find.text('Midnight OLED'), findsNothing);
  });

  testWidgets('Enabled select item still opens the option picker sheet',
      (tester) async {
    final item = SettingItem(
      id: 'test_theme_enabled',
      component: SettingComponent.select,
      title: (l) => 'Theme',
      subtitle: (l) => '',
      settingKey: 'appearance.theme',
      scope: SettingScope.synchronized,
      defaultValue: 'dark_slate',
      options: [
        SettingOption('dark_slate', (l) => 'Dark Slate'),
        SettingOption('midnight_oled', (l) => 'Midnight OLED'),
        SettingOption('forest', (l) => 'Forest'),
      ],
    );
    await tester.pumpWidget(_wrap(SettingsItemRenderer(item: item)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Theme'));
    await tester.pumpAndSettle();

    expect(find.text('Midnight OLED'), findsOneWidget);
    expect(find.text('Forest'), findsOneWidget);
  });

  testWidgets('Root settings page lists all ten categories', (tester) async {
    await tester.pumpWidget(_wrap(const SettingsPage()));
    await tester.pumpAndSettle();

    for (final title in [
      'Account',
      'Chat',
      'Customization',
      'Storage',
      'Security & Privacy',
      'Notifications',
      'Voice & Video',
      'System',
      'Language & Time',
      'Info & Diagnostics',
    ]) {
      expect(find.text(title), findsOneWidget, reason: title);
    }
  });
}
