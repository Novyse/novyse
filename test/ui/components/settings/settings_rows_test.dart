import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_external_link_row.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';
import 'package:novyse/ui/components/settings/settings_switch_row.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: child);
}

/// In-memory settings stub (no SQLite) for renderer visibility tests.
class _StubSettingsController extends SettingsController {
  _StubSettingsController(this.preset);

  final Map<String, Object?> preset;

  @override
  Map<String, Object?> build() => Map<String, Object?>.of(preset);
}

Widget _rendererWithSettings(
  Map<String, Object?> preset,
  SettingItem item, {
  bool? isPremium,
}) {
  return ProviderScope(
    overrides: [
      settingsControllerProvider.overrideWith(
        () => _StubSettingsController(preset),
      ),
      if (isPremium != null) isPremiumProvider.overrideWithValue(isPremium),
    ],
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: SettingsItemRenderer(item: item)),
    ),
  );
}

void main() {
  testWidgets('SettingsPageTemplate renders floating title and sections', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SettingsPageTemplate(
          title: 'Impostazioni',
          showBack: false,
          children: [
            SettingsSection(
              title: 'Generali',
              children: [
                SettingsNavigationRow(
                  icon: HugeIcons.strokeRoundedSmile,
                  title: 'Account',
                  subtitle: 'Gestisci il tuo profilo',
                ),
              ],
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Impostazioni'), findsOneWidget);
    expect(find.text('Generali'), findsOneWidget);
    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Gestisci il tuo profilo'), findsOneWidget);
    // No back pill on the root page.
    expect(find.byType(IconButton), findsNothing);
  });

  testWidgets('SettingsPageTemplate shows back pill on subpages', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const SettingsPageTemplate(
          title: 'Account',
          children: [
            SettingsSection(
              children: [
                SettingsValueRow(title: 'Username', valueText: 'mattia'),
              ],
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(IconButton), findsOneWidget);
  });

  testWidgets('SettingsSection inserts dividers automatically', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const SettingsSection(
          children: [
            SettingsValueRow(title: 'Username', valueText: 'mattia'),
            SettingsValueRow(title: 'Email', valueText: 'mattia@novyse.app'),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(Divider), findsOneWidget);
  });

  testWidgets('SettingsNavigationRow arrow only shows when tappable', (
    tester,
  ) async {
    await tester.pumpWidget(_wrap(const SettingsNavigationRow(title: 'Plain')));
    await tester.pumpAndSettle();
    expect(find.byType(AppHugeIcon), findsNothing);

    await tester.pumpWidget(
      _wrap(SettingsNavigationRow(title: 'Linked', onTap: () {})),
    );
    await tester.pumpAndSettle();
    // The trailing arrow.
    expect(find.byType(AppHugeIcon), findsOneWidget);
  });

  testWidgets(
    'SettingsExternalLinkRow uses box-arrow icon only when tappable',
    (tester) async {
      await tester.pumpWidget(
        _wrap(const SettingsExternalLinkRow(title: 'Plain')),
      );
      await tester.pumpAndSettle();
      expect(find.byType(AppHugeIcon), findsNothing);

      await tester.pumpWidget(
        _wrap(SettingsExternalLinkRow(title: 'Linked', onTap: () {})),
      );
      await tester.pumpAndSettle();
      final iconWidget = tester.widget<AppHugeIcon>(find.byType(AppHugeIcon));
      expect(iconWidget.icon, HugeIcons.strokeRoundedSquareArrowOutUpRight);
    },
  );

  testWidgets('SettingsExternalLinkRow icon differs from navigation/modal', (
    tester,
  ) async {
    expect(
      HugeIcons.strokeRoundedSquareArrowOutUpRight,
      isNot(HugeIcons.strokeRoundedArrowRight01),
    );
    expect(
      HugeIcons.strokeRoundedSquareArrowOutUpRight,
      isNot(HugeIcons.strokeRoundedArrowUpRight01),
    );
  });

  testWidgets('SettingsExternalLinkRow triggers onTap', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(
        SettingsExternalLinkRow(title: 'Website', onTap: () => tapped = true),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Website'));
    expect(tapped, isTrue);
  });

  testWidgets('SettingsExternalLinkRow shows icon when url is provided', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SettingsExternalLinkRow(title: 'Site', url: '')),
    );
    await tester.pumpAndSettle();
    expect(find.byType(AppHugeIcon), findsNothing);

    await tester.pumpWidget(
      _wrap(
        const SettingsExternalLinkRow(
          title: 'Site',
          url: 'https://www.novyse.com',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(AppHugeIcon), findsOneWidget);
  });

  testWidgets('SettingsExternalLinkRow onTap takes precedence over url', (
    tester,
  ) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(
        SettingsExternalLinkRow(
          title: 'Site',
          url: 'https://www.novyse.com',
          onTap: () => tapped = true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Site'));
    expect(tapped, isTrue);
  });

  testWidgets('SettingsNavigationRow navigates on tap', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(
        SettingsNavigationRow(title: 'Account', onTap: () => tapped = true),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Account'));
    expect(tapped, isTrue);
  });

  testWidgets('SettingsSwitchRow toggles value on row tap', (tester) async {
    var value = false;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            return SettingsSwitchRow(
              title: 'Messaggi',
              value: value,
              onChanged: (next) => setState(() => value = next),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(Switch), findsOneWidget);
    await tester.tap(find.text('Messaggi'));
    await tester.pumpAndSettle();
    expect(value, isTrue);
  });

  testWidgets('SettingsValueRow prints value on the right', (tester) async {
    await tester.pumpWidget(
      _wrap(const SettingsValueRow(title: 'Username', valueText: 'mattia')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Username'), findsOneWidget);
    expect(find.text('mattia'), findsOneWidget);
  });

  testWidgets('SettingsSelectRow triggers onTap', (tester) async {
    var selected = '';
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            return SettingsSelectRow(
              title: 'Italiano',
              selected: selected == 'it',
              onTap: () => setState(() => selected = 'it'),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Italiano'));
    await tester.pumpAndSettle();
    expect(selected, 'it');
  });

  testWidgets('SettingsSelectRow ignores taps when disabled', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      _wrap(
        SettingsSelectRow(
          title: '4K Ultra HD',
          selected: false,
          disabled: true,
          onTap: () => tapped = true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('4K Ultra HD'), findsOneWidget);
    // Opacity 0.5 signals the disabled state...
    final opacity = tester.widget<Opacity>(find.byType(Opacity));
    expect(opacity.opacity, 0.5);
    // ...and the row's own IgnorePointer (ignoring: true) swallows taps.
    final rowPointers = find.ancestor(
      of: find.text('4K Ultra HD'),
      matching: find.byType(IgnorePointer),
    );
    final ignoring = [
      for (var i = 0; i < rowPointers.evaluate().length; i++)
        tester.widget<IgnorePointer>(rowPointers.at(i)),
    ].where((w) => w.ignoring).toList();
    expect(ignoring, hasLength(1));
    await tester.tap(find.text('4K Ultra HD'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(tapped, isFalse);
  });

  group('SettingsItemRenderer visibleWhen', () {
    SettingItem customQuality() =>
        SettingsCatalog.findBySettingKey('comms.shareCustomQuality')!;

    testWidgets('shows custom rows in personalized mode', (tester) async {
      await tester.pumpWidget(
        _rendererWithSettings({'comms.shareQuality': 'custom'}, customQuality()),
      );
      await tester.pumpAndSettle();
      expect(find.byType(SettingsValueRow), findsOneWidget);
    });

    testWidgets('hides custom rows in fluid mode', (tester) async {
      await tester.pumpWidget(
        _rendererWithSettings(
          {'comms.shareQuality': 'fluid_60'},
          customQuality(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(SettingsValueRow), findsNothing);
    });

    testWidgets('falls back to the default when the mode is unset', (
      tester,
    ) async {
      // No stored mode → default fluid_60 ≠ custom → hidden.
      await tester.pumpWidget(_rendererWithSettings({}, customQuality()));
      await tester.pumpAndSettle();
      expect(find.byType(SettingsValueRow), findsNothing);
    });
  });

  group('SettingsItemRenderer stepper error & premium check', () {
    SettingItem videoBitrateItem() =>
        SettingsCatalog.findBySettingKey(CommsMediaConstraints.videoBitrateKey)!;

    testWidgets(
      'locks bounds to quality min/max and disables decrement at min',
      (tester) async {
        await tester.pumpWidget(
          _rendererWithSettings(
            {
              CommsMediaConstraints.videoQualityKey: '1080p',
              CommsMediaConstraints.videoFramerateKey: '60',
              CommsMediaConstraints.videoBitrateKey: 1500,
            },
            videoBitrateItem(),
          ),
        );
        await tester.pumpAndSettle();

        final decButton = tester.widget<IconButton>(
          find.byKey(const ValueKey('number_stepper_decrement')),
        );
        expect(decButton.onPressed, isNull);

        expect(
          find.text('Bitrate is below the minimum for this setting'),
          findsNothing,
        );
      },
    );

    testWidgets(
      'shows premium limit error when bitrate > 8000 and isPremium is false',
      (tester) async {
        await tester.pumpWidget(
          _rendererWithSettings(
            {
              CommsMediaConstraints.videoQualityKey: '1440p',
              CommsMediaConstraints.videoFramerateKey: '60',
              CommsMediaConstraints.videoBitrateKey: 10000,
            },
            videoBitrateItem(),
            isPremium: false,
          ),
        );
        await tester.pumpAndSettle();

        expect(
          find.text('Subscribe to Premium to unlock all features (WIP)'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'shows no error when bitrate > 8000 and isPremium is true',
      (tester) async {
        await tester.pumpWidget(
          _rendererWithSettings(
            {
              CommsMediaConstraints.videoQualityKey: '1440p',
              CommsMediaConstraints.videoFramerateKey: '60',
              CommsMediaConstraints.videoBitrateKey: 10000,
            },
            videoBitrateItem(),
            isPremium: true,
          ),
        );
        await tester.pumpAndSettle();

        expect(
          find.text('Subscribe to Premium to unlock all features (WIP)'),
          findsNothing,
        );
        expect(
          find.text('Bitrate is below the minimum for this setting'),
          findsNothing,
        );
      },
    );
  });
}

