import 'package:flutter/material.dart';

import 'settings_subpages.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          const _SettingsSection(title: 'Generali'),
          _SettingsTile(
            icon: Icons.person_outline,
            title: 'Account',
            subtitle: 'Gestisci il tuo profilo',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const SettingsAccountPage(),
              ),
            ),
          ),
          _SettingsTile(
            icon: Icons.notifications_none,
            title: 'Notifiche',
            subtitle: 'Preferenze di notifica',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const SettingsNotificationsPage(),
              ),
            ),
          ),
          const _SettingsTile(
            icon: Icons.security,
            title: 'Privacy',
            subtitle: 'Controlla i permessi e la sicurezza',
          ),
          const SizedBox(height: 20),
          const _SettingsSection(title: 'App'),
          const _SettingsTile(
            icon: Icons.palette_outlined,
            title: 'Tema',
            subtitle: 'Leggero, scuro e automatico',
          ),
          const _SettingsTile(
            icon: Icons.language_outlined,
            title: 'Lingua',
            subtitle: 'Italiano',
          ),
          const _SettingsTile(
            icon: Icons.info_outline,
            title: 'Info',
            subtitle: 'Versione e dettagli',
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;

  const _SettingsSection({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
