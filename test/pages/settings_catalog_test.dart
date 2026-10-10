import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/pages/app/settings/active_devices_page.dart';
import 'package:novyse/pages/app/settings/api_keys_page.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/pages/app/settings/settings_page.dart';
import 'package:novyse/ui/components/copy_text_field.dart';
import 'package:novyse/ui/components/settings/security/security_list_card.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';
import 'package:novyse/ui/components/settings/settings_external_link_row.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';
import 'package:novyse/ui/components/status/status_message.dart';

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

  testWidgets('active devices page shows an empty state without sessions', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('en'),
          home: ActiveDevicesPage(sessionLoader: _emptySessionLoader),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Signed-in devices'), findsOneWidget);
    expect(find.text('No active device sessions found.'), findsOneWidget);
    expect(find.byType(SecurityListCard), findsNothing);
  });

  testWidgets(
    'signing out other devices is dangerous and requires confirmation',
    (tester) async {
      var revokeCount = 0;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            localizationsDelegates: localizationsDelegates,
            supportedLocales: supportedLocales,
            locale: const Locale('en'),
            home: ActiveDevicesPage(
              sessionLoader: _emptySessionLoader,
              revokeOtherSessions: () async {
                revokeCount++;
                return true;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final signOutRow = tester.widget<SettingsBaseRow>(
        find.ancestor(
          of: find.text('Sign out other devices'),
          matching: find.byType(SettingsBaseRow),
        ),
      );
      expect(signOutRow.danger, isTrue);
      expect(revokeCount, 0);

      await tester.tap(find.text('Sign out other devices'));
      await tester.pumpAndSettle();
      expect(find.text('Sign out devices'), findsOneWidget);
      expect(revokeCount, 0);

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(revokeCount, 0);

      await tester.tap(find.text('Sign out other devices'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign out devices'));
      await tester.pumpAndSettle();
      expect(revokeCount, 1);
    },
  );

  testWidgets('active devices render one security card per session', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: ActiveDevicesPage(
            sessionLoader: () async => [
              {
                'id': 1,
                'userAgent': 'Novyse Desktop',
                'platform': 'desktop',
                'ipAddress': '127.0.0.1',
                'createdAt': '2026-10-01T10:00:00Z',
                'lastActiveAt': '2026-10-05T10:00:00Z',
                'isCurrent': true,
              },
              {
                'id': 2,
                'userAgent': 'Novyse Mobile',
                'platform': 'mobile',
                'ipAddress': '192.0.2.1',
                'createdAt': '2026-09-01T10:00:00Z',
                'lastActiveAt': '2026-10-04T10:00:00Z',
                'isCurrent': false,
              },
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(SecurityListCard), findsNWidgets(2));
    expect(find.text('Novyse Desktop'), findsOneWidget);
    expect(find.text('Novyse Mobile'), findsOneWidget);
    expect(find.text('Current device'), findsOneWidget);
  });

  testWidgets('API keys page shows its empty state and lets you create a key', (
    tester,
  ) async {
    final keys = <Map<String, dynamic>>[];
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: ApiKeysPage(
            loadKeys: () async => List<Map<String, dynamic>>.of(keys),
            createKey: (name) async {
              keys.add({
                'id': 1,
                'name': name,
                'created_at': '2026-10-05T10:00:00Z',
                'active': true,
              });
              return {'apiKey': 'secret-api-key'};
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No API keys yet'), findsOneWidget);
    await tester.tap(find.text('Create API key'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Test integration');
    expect(
      tester
          .widget<TextButton>(find.widgetWithText(TextButton, 'Create key'))
          .onPressed,
      isNotNull,
    );
    await tester.tap(find.text('Create key'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(keys, hasLength(1));
    expect(find.text('API key created'), findsOneWidget);
    expect(find.text('secret-api-key'), findsOneWidget);
    expect(find.byType(StatusMessage), findsNWidgets(2));
    expect(find.byType(CopyTextField), findsOneWidget);

    await tester.tap(find.text('Done'));
    await tester.pumpAndSettle();
    expect(find.text('Test integration'), findsOneWidget);
    expect(find.byType(SecurityListCard), findsOneWidget);
  });

  testWidgets('API key can be toggled and revocation requires confirmation', (
    tester,
  ) async {
    var active = true;
    var revokeCount = 0;
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: const Locale('en'),
          home: ApiKeysPage(
            loadKeys: () async => [
              {
                'id': 4,
                'name': 'Deployment bot',
                'created_at': '2026-10-01T10:00:00Z',
                'last_used_at': '2026-10-05T10:00:00Z',
                'active': active,
              },
            ],
            updateKeyActive: (id, value) async {
              expect(id, 4);
              active = value;
              return true;
            },
            revokeKey: (id) async {
              expect(id, 4);
              revokeCount++;
              return true;
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Deployment bot'), findsOneWidget);
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(active, isFalse);

    await tester.tap(find.byTooltip('Revoke API key'));
    await tester.pumpAndSettle();
    expect(find.text('Revoke key'), findsOneWidget);
    expect(revokeCount, 0);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(revokeCount, 0);

    await tester.tap(find.byTooltip('Revoke API key'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Revoke key'));
    await tester.pumpAndSettle();
    expect(revokeCount, 1);
  });

  testWidgets(
    'security items are renamed and password page only changes password',
    (tester) async {
      await tester.pumpWidget(
        _wrap(
          const SettingsGroupPage(
            categoryId: 'security',
            pageId: 'security_auth',
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('API Keys'), findsOneWidget);
      expect(
        lookupAppLocalizations(const Locale('en')).settingsItemApiKeysSubtitle,
        'Keys for apps and services that connect to your account',
      );
      await tester.tap(find.text('Password'));
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Change password'), findsOneWidget);
      expect(find.text('Password protected'), findsNothing);
      expect(find.text('Actions'), findsNothing);
    },
  );

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

Future<List<Map<String, dynamic>>> _emptySessionLoader() async => const [];
