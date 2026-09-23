import 'package:flutter/material.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_switch_row.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

class SettingsAccountPage extends StatelessWidget {
  const SettingsAccountPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SettingsPageTemplate(
      title: 'Account',
      children: [
        SettingsSection(
          children: [
            SettingsValueRow(title: 'Username', valueText: 'mattia'),
            SettingsValueRow(title: 'Email', valueText: 'mattia@novyse.app'),
          ],
        ),
      ],
    );
  }
}

class SettingsNotificationsPage extends StatelessWidget {
  const SettingsNotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const SettingsPageTemplate(
      title: 'Notifiche',
      children: [
        SettingsSection(
          children: [
            SettingsSwitchRow(
              title: 'Messaggi',
              subtitle: 'Placeholder',
              value: true,
              onChanged: null,
            ),
            SettingsSwitchRow(
              title: 'Anteprime',
              subtitle: 'Placeholder',
              value: false,
              onChanged: null,
            ),
          ],
        ),
      ],
    );
  }
}
