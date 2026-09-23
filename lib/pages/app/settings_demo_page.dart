import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_modal_row.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';
import 'package:novyse/ui/components/settings/settings_switch_row.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

/// Demo page showcasing every settings component.
///
/// Only reachable from the debug entry in [SettingsPage]; used to visually
/// check how the template, sections and rows turned out.
class SettingsDemoPage extends StatefulWidget {
  const SettingsDemoPage({super.key});

  @override
  State<SettingsDemoPage> createState() => _SettingsDemoPageState();
}

class _SettingsDemoPageState extends State<SettingsDemoPage> {
  bool _messages = true;
  bool _previews = false;
  String _language = 'it';

  void _demoSnack(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  /// Custom leading mirroring `production` flag rows (e.g. language page).
  Widget _flagLeading(String emoji) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: 35,
      height: 35,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: colorScheme.primary.withValues(alpha: 0.08),
      ),
      alignment: Alignment.center,
      child: Text(emoji, style: const TextStyle(fontSize: 20)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SettingsPageTemplate(
      title: 'Demo componenti',
      subtitle: 'Showcase righe settings',
      actions: [
        IconButton(
          icon: const AppHugeIcon(
            icon: HugeIcons.strokeRoundedCheckmarkCircle01,
          ),
          tooltip: 'Azione demo',
          onPressed: () => _demoSnack('Azione nella pill premuta'),
        ),
      ],
      children: [
        SettingsSection(
          title: 'Navigazione',
          children: [
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedSmile,
              title: 'Account',
              subtitle: 'Riga con icona, sottotitolo e freccia',
              onTap: () => _demoSnack('Navigazione premuta'),
            ),
            SettingsNavigationRow(
              title: 'Senza icona né tap',
              subtitle: 'Niente leading e niente freccia',
            ),
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedDelete01,
              title: 'Elimina account',
              subtitle: 'Variante danger',
              danger: true,
              onTap: () => _demoSnack('Danger premuta'),
            ),
          ],
        ),
        SettingsSection(
          title: 'Modali',
          children: [
            SettingsModalRow(
              icon: HugeIcons.strokeRoundedFilterHorizontal,
              title: 'Filtri',
              subtitle: 'Apre un modale invece di navigare',
              onTap: () => _demoSnack('Modale premuto'),
            ),
            const SettingsModalRow(
              icon: HugeIcons.strokeRoundedInformationCircle,
              title: 'Solo informativa',
              subtitle: 'Senza onTap, niente icona di destra',
            ),
          ],
        ),
        SettingsSection(
          title: 'Interruttori',
          children: [
            SettingsSwitchRow(
              icon: HugeIcons.strokeRoundedNotification01,
              title: 'Messaggi',
              subtitle: 'Tap sulla riga = toggle',
              value: _messages,
              onChanged: (next) => setState(() => _messages = next),
            ),
            SettingsSwitchRow(
              icon: HugeIcons.strokeRoundedChat01,
              title: 'Anteprime',
              subtitle: 'Secondo switch funzionante',
              value: _previews,
              onChanged: (next) => setState(() => _previews = next),
            ),
            const SettingsSwitchRow(
              icon: HugeIcons.strokeRoundedShield01,
              title: 'Disabilitato',
              subtitle: 'onChanged null = placeholder',
              value: false,
              onChanged: null,
            ),
          ],
        ),
        SettingsSection(
          title: 'Valori',
          children: [
            const SettingsValueRow(
              icon: HugeIcons.strokeRoundedSmile,
              title: 'Username',
              valueText: 'mattia',
            ),
            const SettingsValueRow(
              title: 'Senza icona',
              valueText: 'solo testo a destra',
            ),
            SettingsValueRow(
              leading: _flagLeading('🇮🇹'),
              title: 'Con leading custom',
              subtitle: 'Come le bandiere in production',
              valueText: 'Italiano',
              onTap: () => _demoSnack('Riga valore premuta'),
            ),
          ],
        ),
        SettingsSection(
          title: 'Selezione singola',
          children: [
            SettingsSelectRow(
              leading: _flagLeading('🇮🇹'),
              title: 'Italiano',
              valueText: 'it',
              selected: _language == 'it',
              onTap: () => setState(() => _language = 'it'),
            ),
            SettingsSelectRow(
              leading: _flagLeading('🇬🇧'),
              title: 'English',
              valueText: 'en',
              selected: _language == 'en',
              onTap: () => setState(() => _language = 'en'),
            ),
          ],
        ),
      ],
    );
  }
}
