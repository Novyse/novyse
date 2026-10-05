import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/pages/app/settings/settings_page.dart';
import 'package:novyse/ui/components/settings/settings_external_link_row.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

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
  testWidgets('Account category lists pages and loose actions in wiki order', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SettingsCategoryPage(categoryId: 'account')),
    );
    await tester.pumpAndSettle();

    final editProfile = find.text('Edit Profile');
    final logout = find.text('Logout');
    final delete = find.text('Delete Profile');
    expect(editProfile, findsOneWidget);
    expect(logout, findsOneWidget);
    expect(delete, findsOneWidget);
    expect(find.text('Active Sessions'), findsNothing);

    // Wiki order: profile page, logout, delete.
    expect(
      tester.getTopLeft(editProfile).dy < tester.getTopLeft(logout).dy,
      isTrue,
    );
    expect(tester.getTopLeft(logout).dy < tester.getTopLeft(delete).dy, isTrue);
  });

  testWidgets('Logout action is enabled: tap opens a confirm sheet', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SettingsCategoryPage(categoryId: 'account')),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();

    // Enabled action: confirm sheet must appear.
    expect(find.text('Cancel').hitTestable(), findsOneWidget);
    expect(find.text('Confirm').hitTestable(), findsOneWidget);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm'), findsNothing);
  });

  testWidgets('Enabled action item still opens a confirmation sheet', (
    tester,
  ) async {
    final item = SettingItem(
      id: 'test_logout_enabled',
      component: SettingComponent.action,
      title: (l) => 'Logout',
      subtitle: (l) => '',
      scope: SettingScope.local,
      actionId: 'logout',
      // disabled defaults to false -> interactive.
    );
    await tester.pumpWidget(_wrap(SettingsItemRenderer(item: item)));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();

    // Confirm sheet with cancel/confirm buttons.
    expect(find.text('Cancel').hitTestable(), findsOneWidget);
    expect(find.text('Confirm').hitTestable(), findsOneWidget);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm'), findsNothing);
  });

  testWidgets('Theme palette select opens the option picker', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const SettingsGroupPage(
          categoryId: 'customization',
          pageId: 'customization_themes',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Color palette'));
    await tester.pumpAndSettle();

    expect(find.text('Forest'), findsOneWidget);
    expect(find.text('Iris'), findsOneWidget);
  });

  testWidgets('Enabled select item still opens the option picker sheet', (
    tester,
  ) async {
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

  testWidgets('Root settings page hides System outside desktop', (
    tester,
  ) async {
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
      'Language & Time',
      'Info & Diagnostics',
    ]) {
      expect(find.text(title), findsOneWidget, reason: title);
    }
    expect(
      find.text('System'),
      currentPlatform == AppPlatform.desktop ? findsOneWidget : findsNothing,
    );
  });

  testWidgets('version and update channel are informational values', (
    tester,
  ) async {
    final info = SettingsCatalog.findCategory('info')!;
    final version = info.items.firstWhere((item) => item.id == 'version');
    final channel = info.items.firstWhere(
      (item) => item.id == 'release_channel',
    );

    await tester.pumpWidget(
      _wrap(
        Scaffold(
          body: Column(
            children: [
              SettingsItemRenderer(item: version),
              SettingsItemRenderer(item: channel),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final versionRow = tester.widget<SettingsValueRow>(
      find.ancestor(
        of: find.text('Version'),
        matching: find.byType(SettingsValueRow),
      ),
    );
    final channelRow = tester.widget<SettingsValueRow>(
      find.ancestor(
        of: find.text('Update Channel'),
        matching: find.byType(SettingsValueRow),
      ),
    );
    expect(versionRow.onTap, isNull);
    expect(channelRow.onTap, isNull);
    expect(find.text('Version'), findsOneWidget);
    expect(find.text(config.appVersion), findsOneWidget);
    expect(find.text(config.updateChannel), findsOneWidget);
  });

  testWidgets('official resources page exposes all four external links', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SettingsGroupPage(categoryId: 'info', pageId: 'resources')),
    );
    await tester.pumpAndSettle();

    final links = tester.widgetList<SettingsExternalLinkRow>(
      find.byType(SettingsExternalLinkRow),
    );
    expect(links.map((link) => link.url).toList(), [
      '${config.landingPageUrl}/roadmap',
      '${config.landingPageUrl}/patchnotes',
      '${config.landingPageUrl}/news',
      config.statusPageUrl,
    ]);
    expect(find.text('Roadmap'), findsOneWidget);
    expect(find.text('Patch Notes'), findsOneWidget);
    expect(find.text('News'), findsOneWidget);
    expect(find.text('Service Status'), findsOneWidget);
    expect(find.text('Official Links & Resources'), findsOneWidget);
    expect(find.text('Discover Novyse'), findsOneWidget);
  });

  testWidgets('Delete profile opens the username-confirmed sheet', (
    tester,
  ) async {
    const localUser = UserModel(uuid: 'u1', name: 'Test', handle: 'testuser');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [localUserProvider.overrideWithValue(localUser)],
        child: const MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('en'),
          home: SettingsCategoryPage(categoryId: 'account'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Delete Profile'));
    await tester.pumpAndSettle();

    // Dedicated sheet ported from the development DeleteAccount modal.
    expect(find.text('Delete Account'), findsOneWidget);
    expect(
      find.text('Type your username testuser to confirm.'),
      findsOneWidget,
    );
    expect(find.text('Learn More'), findsOneWidget);

    // Danger action stays disabled until the handle matches.
    TextButton deleteButton() =>
        tester.widget<TextButton>(find.widgetWithText(TextButton, 'Delete'));
    expect(deleteButton().onPressed, isNull);

    await tester.enterText(find.byType(TextField), 'someone_else');
    await tester.pumpAndSettle();
    expect(deleteButton().onPressed, isNull);

    await tester.enterText(find.byType(TextField), 'testuser');
    await tester.pumpAndSettle();
    expect(deleteButton().onPressed, isNotNull);
  });
}
