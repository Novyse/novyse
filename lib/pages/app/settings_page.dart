import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

import 'settings_demo_page.dart';
import 'settings_subpages.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return SettingsPageTemplate(
      title: l10n.settings,
      showBack: false,
      children: [
        const SettingsSection(
          title: 'Generali',
          children: [
            _AccountRow(),
            _NotificationsRow(),
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedShield01,
              title: 'Privacy',
              subtitle: 'Controlla i permessi e la sicurezza',
            ),
          ],
        ),
        const SettingsSection(
          title: 'App',
          children: [
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedAlbum01,
              title: 'Tema',
              subtitle: 'Leggero, scuro e automatico',
            ),
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedChat01,
              title: 'Lingua',
              subtitle: 'Italiano',
            ),
            SettingsNavigationRow(
              icon: HugeIcons.strokeRoundedInformationCircle,
              title: 'Info',
              subtitle: 'Versione e dettagli',
            ),
          ],
        ),
        if (kDebugMode) const _DebugSection(),
      ],
    );
  }
}

class _DebugSection extends StatelessWidget {
  const _DebugSection();

  @override
  Widget build(BuildContext context) {
    return SettingsSection(
      title: 'Debug',
      children: [
        SettingsNavigationRow(
          icon: HugeIcons.strokeRoundedTestTube01,
          title: 'Demo componenti',
          subtitle: 'Showcase delle righe settings',
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SettingsDemoPage()),
          ),
        ),
      ],
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow();

  @override
  Widget build(BuildContext context) {
    return SettingsNavigationRow(
      icon: HugeIcons.strokeRoundedSmile,
      title: 'Account',
      subtitle: 'Gestisci il tuo profilo',
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const SettingsAccountPage()),
      ),
    );
  }
}

class _NotificationsRow extends StatelessWidget {
  const _NotificationsRow();

  @override
  Widget build(BuildContext context) {
    return SettingsNavigationRow(
      icon: HugeIcons.strokeRoundedNotification01,
      title: 'Notifiche',
      subtitle: 'Preferenze di notifica',
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => const SettingsNotificationsPage(),
        ),
      ),
    );
  }
}
