import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';
import 'package:novyse/ui/components/settings/settings_switch_row.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: child);
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
}
